// services/productService.ts
// Fully updated, self-contained service for dynamic Product Types and multi-variant Products.

import { ctJsonGetOrNull, ctJsonPost } from "../commercetools/client";

/** =========================
 *  Types
 *  ========================= */
export type EnumSpec = { key: string; label: string };

export type AttributeSpec =
  | { name: string; type: "text"; required?: boolean; searchable?: boolean }
  | { name: string; type: "number"; required?: boolean; searchable?: boolean }
  | { name: string; type: "boolean"; required?: boolean; searchable?: boolean }
  | { name: string; type: "enum"; values: EnumSpec[]; required?: boolean; searchable?: boolean };

export type ProductTypeConfig = {
  key: string;                  // e.g. "mobile-type-v1"
  attributes: AttributeSpec[];  // dynamic schema per type
};

export type VariantInput = {
  sku: string;
  attributes?: Record<string, any>; // values must conform to the Product Type (enum keys, etc.)
  centAmount?: number;              // optional per-variant price
  currencyCode?: string;            // optional per-variant currency
  images?: { url: string; w: number; h: number }[];
};

export type CreateProductInput = {
  name: string;
  currencyCode: string;
  centAmount: number;
  sku: string;                        // master variant SKU
  slug?: string;
  locale?: string;                    // default "en"
  key?: string;                       // product key (idempotency-friendly if you manage uniqueness)
  publish?: boolean;                  // default true
  productTypeKey?: string;            // fallback if productTypeConfig not provided
  productTypeConfig?: ProductTypeConfig; // dynamic schema per call
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

function localized(value: string, locale = "en") {
  return { [locale]: value };
}

function attrObjToArray(obj?: Record<string, any>) {
  if (!obj) return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

/** =========================
 *  Product Type Ensure / Update (idempotent)
 *  ========================= */
function attrDefFromSpec(a: AttributeSpec) {
  const base = {
    name: a.name,
    label: { en: a.name[0]?.toUpperCase() + a.name.slice(1) },
    isRequired: !!a.required,
    isSearchable: a.searchable !== false, // default true
    attributeConstraint: "None",
    inputHint: "SingleLine",
  };

  switch (a.type) {
    case "enum":
      return { ...base, type: { name: "enum", values: a.values } };
    case "number":
      return { ...base, type: { name: "number" } };
    case "boolean":
      return { ...base, type: { name: "boolean" } };
    case "text":
    default:
      return { ...base, type: { name: "text" } };
  }
}

/**
 * Ensure a Product Type with the given key exists and contains at least the attributes specified.
 * - Creates Product Type if missing.
 * - Adds missing attributes.
 * - For enum attributes, adds missing enum values.
 */
export async function ensureProductTypeWithAttributes(
  key: string,
  attrs: AttributeSpec[]
) {
  const existing = await ctJsonGetOrNull(`/product-types/key=${encodeURIComponent(key)}`);

  if (!existing) {
    // Create a fresh Product Type
    return await ctJsonPost(`/product-types`, {
      key,
      name: key,
      description: `Product type for ${key}`,
      attributes: attrs.map(attrDefFromSpec),
    });
  }

  // Patch missing attributes / enum values idempotently
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
 *  Product Create (master + variants) with optional publish
 *  ========================= */
export async function createProduct(input: CreateProductInput) {
  const {
    name,
    currencyCode,
    centAmount,
    sku,
    slug,
    locale = "en",
    key,
    publish = true,
    productTypeKey = "default-product-type",
    productTypeConfig,
    attributes = {},
    variants = [],
  } = input;

  // Determine dynamic Product Type to use (and ensure it exists / updated)
  const typeKey = productTypeConfig?.key ?? productTypeKey;
  const typeAttrs =
    productTypeConfig?.attributes ??
    [
      // Very small safe default if none provided
      { name: "color", type: "enum", values: [{ key: "black", label: "Black" }] } as AttributeSpec,
      { name: "size", type: "enum", values: [{ key: "m", label: "M" }] } as AttributeSpec,
    ];

  const productType = await ensureProductTypeWithAttributes(typeKey, typeAttrs);

  // Build product draft
  const draft: any = {
    key,
    productType: { id: productType.id },
    name: localized(name, locale),
    slug: localized(slug || toSlug(name), locale),
    masterVariant: {
      sku,
      attributes: attrObjToArray(attributes),
      prices: [{ value: { currencyCode, centAmount } }],
    },
    variants: variants.map((v) => ({
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
      images: (v.images ?? []).map((img) => ({
        url: img.url,
        dimensions: { w: img.w, h: img.h },
      })),
    })),
    publish, // publish immediately if true
  };

  // Create the product
  const created = await ctJsonPost(`/products`, draft);
  return created;
}

/** =========================
 *  Publish / Unpublish helpers (for workflows where you don't publish on create)
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
