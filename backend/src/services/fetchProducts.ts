// src/services/fetchProduct.ts
// Service that reads Product Projections for storefront (listing & detail)

import type { ProductProjection } from "@commercetools/platform-sdk"; // optional but useful for types
import { ctJsonGet } from "../commercetools/client";

/** ---------- Types returned to your frontend ---------- */
export type MoneyView = {
  currencyCode: string;
  amount: number; // decimal value for UI
  centAmount: number;
  fractionDigits: number;
};

export type PriceView = {
  price: MoneyView | null;
  discounted?: MoneyView | null;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  thumbnail?: string;
  variantId: number;
  sku?: string;
  price: PriceView;
};

export type VariantView = {
  id: number;
  sku?: string;
  images: string[];
  price: PriceView;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  masterVariant: VariantView;
  variants: VariantView[];
};

/** ---------- Helpers ---------- */
function pickLocale<T extends Record<string, string>>(loc: T | undefined, locale: string): string | undefined {
  if (!loc) return undefined;
  if (loc[locale]) return loc[locale];
  // simple fallback: first value
  const vals = Object.values(loc);
  return vals.length ? vals[0] : undefined;
}

function moneyToView(
  value?: { currencyCode: string; centAmount: number; fractionDigits: number } | null
): MoneyView | null {
  if (!value) return null;
  const { currencyCode, centAmount, fractionDigits } = value;
  return {
    currencyCode,
    centAmount,
    fractionDigits,
    amount: centAmount / Math.pow(10, fractionDigits),
  };
}

function priceFromVariant(v: any): PriceView {
  const sp = v?.scopedPrice;
  if (sp?.value) {
    return {
      price: moneyToView(sp.value),
      discounted: sp.discounted ? moneyToView(sp.discounted.value) : null,
    };
  }
  const first = v?.prices?.[0]?.value ?? null;
  return { price: moneyToView(first) };
}

function mapVariant(v: any): VariantView {
  return {
    id: v.id,
    sku: v.sku,
    images: (v.images || []).map((i: any) => i.url),
    price: priceFromVariant(v),
  };
}

function mapListItem(p: ProductProjection, locale: string): ProductListItem {
  const name = pickLocale(p.name as any, locale) || "Untitled";
  const slug = pickLocale(p.slug as any, locale) || p.id;
  const mv: any = p.masterVariant;
  const thumb = mv?.images?.[0]?.url;
  return {
    id: p.id,
    slug,
    name,
    thumbnail: thumb,
    variantId: mv?.id,
    sku: mv?.sku,
    price: priceFromVariant(mv),
  };
}

function mapDetail(p: ProductProjection, locale: string): ProductDetail {
  return {
    id: p.id,
    slug: pickLocale(p.slug as any, locale) || p.id,
    name: pickLocale(p.name as any, locale) || "Untitled",
    description: pickLocale(p.description as any, locale),
    masterVariant: mapVariant(p.masterVariant as any),
    variants: (p.variants || []).map(mapVariant),
  };
}

function escQuotes(s: string) {
  // Escape any " in slug value
  return s.replace(/"/g, '\\"');
}

/** ---------- Public API ---------- */
export async function listProducts(opts: {
  limit?: number;
  offset?: number;
  locale?: string;
  currency?: string;
  country?: string;
  customerGroupId?: string;
  channelId?: string;
  staged?: boolean;
} = {}) {
  const {
    limit = 20,
    offset = 0,
    locale = "en-IN",
    currency = "INR",
    country,
    customerGroupId,
    channelId,
    staged = false,
  } = opts;

  const query: Record<string, any> = { limit, offset, staged };
  // Price selection => scopedPrice on variants
  if (currency) query.priceCurrency = currency;
  if (country) query.priceCountry = country;
  if (customerGroupId) query.priceCustomerGroup = customerGroupId;
  if (channelId) query.priceChannel = channelId;

  const res = await ctJsonGet<{
    count: number;
    total: number;
    offset: number;
    results: ProductProjection[];
  }>("/product-projections", query);

  return {
    count: res.count,
    total: res.total,
    offset: res.offset,
    results: res.results.map((p) => mapListItem(p, locale)),
  };
}

export async function getProductByIdOrSlug(
  idOrSlug: string,
  opts: {
    locale?: string;
    currency?: string;
    country?: string;
    customerGroupId?: string;
    channelId?: string;
    staged?: boolean;
  } = {}
) {
  const { locale = "en-IN", currency = "INR", country, customerGroupId, channelId, staged = false } = opts;

  const common: Record<string, any> = { staged };
  if (currency) common.priceCurrency = currency;
  if (country) common.priceCountry = country;
  if (customerGroupId) common.priceCustomerGroup = customerGroupId;
  if (channelId) common.priceChannel = channelId;

  // 1) Try by ID first
  try {
    const byId = await ctJsonGet<ProductProjection>(`/product-projections/${idOrSlug}`, common);
    return mapDetail(byId, locale);
  } catch {
    // ignore and try slug
  }

  // 2) Try by slug (✅ Correct where syntax: slug(<locale>="<slug>"))
  // Locale (en or en-IN) must NOT be quoted; value must be quoted.
  const where = `slug(${locale}="${escQuotes(idOrSlug)}")`;

  const bySlug = await ctJsonGet<{ count: number; results: ProductProjection[] }>(
    "/product-projections",
    { ...common, where, limit: 1 }
  );

  if (!bySlug.count) {
    const e: any = new Error("Product not found");
    e.status = 404;
    throw e;
  }

  return mapDetail(bySlug.results[0], locale);
}
