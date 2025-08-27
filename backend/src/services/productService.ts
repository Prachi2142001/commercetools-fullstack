// src/services/productService.ts
// Ensures Product Type schema (incl. SameForAll), normalizes enum values,
// and creates a product with localized name/slug/description, master + variants, and optional publish.

import { ctJsonGetOrNull, ctJsonPost } from "../commercetools/client";

/** =========================
 *  Types
 *  ========================= */
export type EnumSpec = { key: string; label: string };

type AttrBase = {
  name: string;
  required?: boolean;
  searchable?: boolean;
  /**
   * If true, attribute is product-level (shown on General tab in MC).
   * We map this to attributeConstraint: "SameForAll" in CT.
   */
  sameForAll?: boolean;
};

export type AttributeSpec =
  | (AttrBase & { type: "text" })
  | (AttrBase & { type: "number" })
  | (AttrBase & { type: "boolean" })
  | (AttrBase & { type: "enum"; values: EnumSpec[] });

export type ProductTypeConfig = {
  key: string;                 // e.g., "electronics-type-v3"
  attributes: AttributeSpec[]; // schema to ensure/update
};

export type VariantInput = {
  sku: string;
  attributes?: Record<string, any>;
  centAmount?: number;              // optional per-variant price
  currencyCode?: string;            // optional per-variant currency
  images?: { url: string; w: number; h: number }[];
};

export type CreateProductInput = {
  // Required core
  name: string;
  currencyCode: string;
  centAmount: number;
  sku: string;

  // Localized content
  locale?: string;                    // default "en-US"
  slug?: string;                      // auto from name if missing
  description?: string;               // optional description (localized)

  // Identity/flags
  key?: string;                       // product key (if you manage uniqueness)
  publish?: boolean;                  // default true

  // Product Type selection
  productTypeKey?: string;            // used if productTypeConfig is not provided
  productTypeConfig?: ProductTypeConfig;

  // Attributes & variants
  attributes?: Record<string, any>;   // master variant attributes
  variants?: VariantInput[];          // additional variants
};

/** =========================
 *  Utils
 *  ========================= */
function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function localized(value: string, locale = "en-US") {
  return { [locale]: value };
}

function attrObjToArray(obj?: Record<string, any>) {
  if (!obj) return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

/**
 * Normalize attribute values to match ProductType definitions:
 * - For enum attributes, accept:
 *    • string "acme" or "Acme" (matches by key/label, case-insensitive)
 *    • object { key } / { key, label } (key must match)
 * - Throws with a clear message if value isn't one of the allowed enum keys.
 */
function normalizeAttributesForDraft(
  attrs: Record<string, any> | undefined,
  typeSpec?: ProductTypeConfig
): Record<string, any> | undefined {
  if (!attrs) return attrs;
  if (!typeSpec) return attrs;

  const specByName = new Map<string, AttributeSpec>();
  for (const s of typeSpec.attributes) specByName.set(s.name, s);

  const out: Record<string, any> = {};

  for (const [name, rawValue] of Object.entries(attrs)) {
    const spec = specByName.get(name);

    if (!spec || spec.type !== "enum") {
      out[name] = rawValue; // pass-through for non-enum
      continue;
    }

    const vals = spec.values;
    const findByKeyCI = (v: string) => vals.find(x => x.key.toLowerCase() === v.toLowerCase());
    const findByLabelCI = (v: string) => vals.find(x => String(x.label).toLowerCase() === v.toLowerCase());

    if (typeof rawValue === "string") {
      const match = findByKeyCI(rawValue) || findByLabelCI(rawValue);
      if (!match) {
        const allowed = vals.map(v => v.key).join('", "');
        throw new Error(`Invalid enum value for attribute "${name}": "${rawValue}". Allowed keys: "${allowed}".`);
      }
      out[name] = { key: match.key, label: match.label };
      continue;
    }

    if (rawValue && typeof rawValue === "object" && "key" in rawValue) {
      const match = findByKeyCI(String(rawValue.key));
      if (!match) {
        const allowed = vals.map(v => v.key).join('", "');
        throw new Error(`Invalid enum object for attribute "${name}": key="${rawValue.key}". Allowed keys: "${allowed}".`);
      }
      out[name] = { key: match.key, label: match.label };
      continue;
    }

    // Fallback (let CT validate)
    out[name] = rawValue;
  }

  return out;
}

/** =========================
 *  Product Type Ensure / Update (idempotent)
 *  ========================= */
function attrDefFromSpec(a: AttributeSpec) {
  // MC shows attributes on "General" only when attributeConstraint is "SameForAll".
  const attributeConstraint = a.sameForAll ? "SameForAll" : "None";

  const base = {
    name: a.name,
    label: { en: a.name[0]?.toUpperCase() + a.name.slice(1) },
    isRequired: !!a.required,
    isSearchable: a.searchable !== false, // default true
    attributeConstraint,                   // ← product-level if "SameForAll"
    inputHint: "SingleLine" as const,
  };

  switch (a.type) {
    case "enum":    return { ...base, type: { name: "enum", values: a.values } };
    case "number":  return { ...base, type: { name: "number" } };
    case "boolean": return { ...base, type: { name: "boolean" } };
    case "text":
    default:        return { ...base, type: { name: "text" } };
  }
}

/**
 * Ensure a Product Type with the given key exists and contains at least the attributes specified.
 * - Creates Product Type if missing.
 * - Adds missing attributes.
 * - For enum attributes, adds missing enum values.
 * Note: you cannot change attributeConstraint of an existing attribute; use a new type key.
 */
export async function ensureProductTypeWithAttributes(
  key: string,
  attrs: AttributeSpec[]
) {
  const existing = await ctJsonGetOrNull(`/product-types/key=${encodeURIComponent(key)}`);

  if (!existing) {
    return await ctJsonPost(`/product-types`, {
      key,
      name: key,
      description: `Product type for ${key}`,
      attributes: attrs.map(attrDefFromSpec),
    });
  }

  let pt = existing;
  const present: Record<string, any> = (pt.attributes ?? []).reduce(
    (m: Record<string, any>, a: any) => {
      m[a.name] = a;
      return m;
    },
    {}
  );

  const actions: any[] = [];

  for (const spec of attrs) {
    const already = present[spec.name];

    if (!already) {
      actions.push({ action: "addAttributeDefinition", attribute: attrDefFromSpec(spec) });
      continue;
    }

    // If enum: add newly requested enum values
    if (spec.type === "enum" && already.type?.name === "enum") {
      const have = new Set((already.type.values ?? []).map((v: any) => v.key));
      for (const v of spec.values) {
        if (!have.has(v.key)) {
          actions.push({
            action: "addPlainEnumValue",
            attributeName: spec.name,
            value: v, // { key, label }
          });
        }
      }
    }
  }

  if (actions.length) {
    pt = await ctJsonPost(`/product-types/${pt.id}`, {
      version: pt.version,
      actions,
    });
  }

  return pt;
}

/** =========================
 *  Product Create (master + variants) with SameForAll injection
 *  ========================= */
export async function createProduct(input: CreateProductInput) {
  const {
    name,
    currencyCode,
    centAmount,
    sku,
    slug,
    locale = "en-US",
    description,
    key,
    publish = true,
    productTypeKey = "default-product-type",
    productTypeConfig,
    attributes = {},
    variants = [],
  } = input;

  // Determine Product Type key + attributes (ensure/update)
  const typeKey = productTypeConfig?.key ?? productTypeKey;
  const typeAttrs: AttributeSpec[] =
    productTypeConfig?.attributes ??
    [
      { name: "color", type: "enum", values: [{ key: "black", label: "Black" }] },
      { name: "size",  type: "enum", values: [{ key: "m",     label: "M"     }] },
    ];

  const productType = await ensureProductTypeWithAttributes(typeKey, typeAttrs);

  // Normalize master attributes
  const normalizedMasterAttrs =
    normalizeAttributesForDraft(attributes, productTypeConfig) ?? {};

  // Collect SameForAll attribute names from the provided type spec
  const sameForAllSet = new Set(
    (productTypeConfig?.attributes ?? [])
      .filter(a => a.sameForAll)
      .map(a => a.name)
  );

  // Ensure master provides values for SameForAll attributes
  for (const name of sameForAllSet) {
    if (normalizedMasterAttrs[name] === undefined) {
      throw new Error(
        `Missing value for product-level attribute "${name}" on master variant.`
      );
    }
  }

  // Normalize variants and inject SameForAll values
  const normalizedVariants = variants.map(v => {
    const vAttrs = normalizeAttributesForDraft(v.attributes, productTypeConfig) ?? {};

    for (const name of sameForAllSet) {
      const masterVal = normalizedMasterAttrs[name];
      if (vAttrs[name] === undefined) {
        vAttrs[name] = masterVal; // inject
      } else {
        // Validate equality (deep enough for our enum/text values)
        const a = JSON.stringify(vAttrs[name]);
        const b = JSON.stringify(masterVal);
        if (a !== b) {
          throw new Error(
            `Attribute "${name}" is SameForAll and must match the master for all variants. ` +
            `Variant "${v.sku}" differs.`
          );
        }
      }
    }

    return { ...v, attributes: vAttrs };
  });

  // Build product draft
  const draft: any = {
    key,
    productType: { id: productType.id },
    name: localized(name, locale),
    slug: localized(slug || toSlug(name), locale),
    masterVariant: {
      sku,
      attributes: attrObjToArray(normalizedMasterAttrs),
      prices: [{ value: { currencyCode, centAmount } }],
    },
    variants: normalizedVariants.map(v => ({
      sku: v.sku,
      attributes: attrObjToArray(v.attributes),
      prices: [
        {
          value: {
            currencyCode: v.currencyCode || currencyCode,
            centAmount: typeof v.centAmount === "number" ? v.centAmount : centAmount,
          },
        },
      ],
      images: (v.images ?? []).map(img => ({
        url: img.url,
        dimensions: { w: img.w, h: img.h },
      })),
    })),
    publish,
  };

  if (description) {
    draft.description = localized(description, locale);
  }

  // Create the product
  const created = await ctJsonPost(`/products`, draft);
  return created;
}

/** =========================
 *  Publish / Unpublish helpers
 *  ========================= */
export async function publishProduct(productId: string, version: number) {
  return await ctJsonPost(`/products/${productId}`, {
    version,
    actions: [{ action: "publish", scope: "All" }],
  });
}

export async function unpublishProduct(productId: string, version: number) {
  return await ctJsonPost(`/products/${productId}`, {
    version,
    actions: [{ action: "unpublish" }],
  });
}
