import { ctJsonGetOrNull, ctJsonPost, getAccessToken } from "../commercetools/client";

export type EnumSpec = { key: string; label: string };

type AttrBase = {
  name: string;
  required?: boolean;
  searchable?: boolean;
  sameForAll?: boolean;
};

export type AttributeSpec =
  | (AttrBase & { type: "text" })
  | (AttrBase & { type: "number" })
  | (AttrBase & { type: "boolean" })
  | (AttrBase & { type: "enum"; values: EnumSpec[] });

export type ProductTypeConfig = {
  key: string;
  attributes: AttributeSpec[];
};

export type VariantInput = {
  sku: string;
  attributes?: Record<string, any>;
  centAmount?: number;
  currencyCode?: string;
  images?: { url: string; w: number; h: number }[];
};

export type CreateProductInput = {
  name: string;
  currencyCode: string;
  centAmount: number;
  sku: string;
  locale?: string;
  slug?: string;
  description?: string;
  key?: string;
  publish?: boolean;
  productTypeKey?: string;
  productTypeConfig?: ProductTypeConfig;
  attributes?: Record<string, any>;
  variants?: VariantInput[];
};

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
      out[name] = rawValue;
      continue;
    }

    const vals = spec.values;
    const findByKeyCI = (v: string) =>
      vals.find((x) => x.key.toLowerCase() === v.toLowerCase());
    const findByLabelCI = (v: string) =>
      vals.find((x) => String(x.label).toLowerCase() === v.toLowerCase());

    if (typeof rawValue === "string") {
      const match = findByKeyCI(rawValue) || findByLabelCI(rawValue);
      if (!match) {
        const allowed = vals.map((v) => v.key).join('", "');
        throw new Error(
          `Invalid enum value for attribute "${name}": "${rawValue}". Allowed keys: "${allowed}".`
        );
      }
      out[name] = { key: match.key, label: match.label };
      continue;
    }

    if (rawValue && typeof rawValue === "object" && "key" in rawValue) {
      const match = findByKeyCI(String(rawValue.key));
      if (!match) {
        const allowed = vals.map((v) => v.key).join('", "');
        throw new Error(
          `Invalid enum object for attribute "${name}": key="${rawValue.key}". Allowed keys: "${allowed}".`
        );
      }
      out[name] = { key: match.key, label: match.label };
      continue;
    }

    out[name] = rawValue;
  }

  return out;
}

function attrDefFromSpec(a: AttributeSpec) {
  const attributeConstraint = a.sameForAll ? "SameForAll" : "None";

  const base = {
    name: a.name,
    label: { en: a.name[0]?.toUpperCase() + a.name.slice(1) },
    isRequired: !!a.required,
    isSearchable: a.searchable !== false,
    attributeConstraint,
    inputHint: "SingleLine" as const,
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

export async function ensureProductTypeWithAttributes(
  key: string,
  attrs: AttributeSpec[]
) {
  const existing = await ctJsonGetOrNull(
    `/product-types/key=${encodeURIComponent(key)}`
  );

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
      actions.push({
        action: "addAttributeDefinition",
        attribute: attrDefFromSpec(spec),
      });
      continue;
    }

    if (spec.type === "enum" && already.type?.name === "enum") {
      const have = new Set((already.type.values ?? []).map((v: any) => v.key));
      for (const v of spec.values) {
        if (!have.has(v.key)) {
          actions.push({
            action: "addPlainEnumValue",
            attributeName: spec.name,
            value: v,
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

  const typeKey = productTypeConfig?.key ?? productTypeKey;
  const typeAttrs: AttributeSpec[] =
    productTypeConfig?.attributes ?? [
      {
        name: "color",
        type: "enum",
        values: [{ key: "black", label: "Black" }],
      },
      { name: "size", type: "enum", values: [{ key: "m", label: "M" }] },
    ];

  const productType = await ensureProductTypeWithAttributes(
    typeKey,
    typeAttrs
  );

  const normalizedMasterAttrs =
    normalizeAttributesForDraft(attributes, productTypeConfig) ?? {};

  const sameForAllSet = new Set(
    (productTypeConfig?.attributes ?? [])
      .filter((a) => a.sameForAll)
      .map((a) => a.name)
  );
  for (const name of sameForAllSet) {
    if (normalizedMasterAttrs[name] === undefined) {
      throw new Error(
        `Missing value for product-level attribute "${name}" on master variant.`
      );
    }
  }

  const normalizedVariants = variants.map((v) => {
    const vAttrs =
      normalizeAttributesForDraft(v.attributes, productTypeConfig) ?? {};

    for (const name of sameForAllSet) {
      const masterVal = normalizedMasterAttrs[name];
      if (vAttrs[name] === undefined) {
        vAttrs[name] = masterVal;
      } else {
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
    variants: normalizedVariants.map((v) => ({
      sku: v.sku,
      attributes: attrObjToArray(v.attributes),
      prices: [
        {
          value: {
            currencyCode: v.currencyCode || currencyCode,
            centAmount:
              typeof v.centAmount === "number" ? v.centAmount : centAmount,
          },
        },
      ],
      images: (v.images ?? []).map((img) => ({
        url: img.url,
        dimensions: { w: img.w, h: img.h },
      })),
    })),
    publish,
  };

  if (description) {
    draft.description = localized(description, locale);
  }

  return await ctJsonPost(`/products`, draft);
}

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

export async function updateProduct(
  id: string,
  version: number,
  actions: any[]
) {
  return await ctJsonPost(`/products/${id}`, { version, actions });
}

export async function deleteProduct(id: string, version: number) {
  const token = await getAccessToken(); 
  const res = await fetch(
    `${process.env.CT_API_URL}/${process.env.CT_PROJECT_KEY}/products/${id}?version=${version}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `DELETE /products/${id} failed (${res.status}): ${text}`
    );
  }

  return res.json();
}
