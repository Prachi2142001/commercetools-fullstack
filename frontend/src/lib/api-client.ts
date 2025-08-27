import type { ProductDetail, ProductListItem } from "@/types/product-types";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-US";
const CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD";

const STORE_FRONT = `${BASE.replace(/\/$/, "")}/api/storefront`;

export async function fetchProductList(
  limit = 20,
  offset = 0
): Promise<{ results: ProductListItem[] }> {
  const url = new URL(`${STORE_FRONT}/products`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("locale", LOCALE);
  url.searchParams.set("currency", CURRENCY);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PLP fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function fetchProductDetail(idOrSlug: string): Promise<ProductDetail> {
  const url = new URL(`${STORE_FRONT}/products/${encodeURIComponent(idOrSlug)}`);
  url.searchParams.set("locale", LOCALE);
  url.searchParams.set("currency", CURRENCY);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PDP fetch failed: ${res.status} ${text}`);
  }
  return res.json();
}
