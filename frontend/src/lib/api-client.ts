import type { ProductDetail, ProductListItem } from "@/types/product-types";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-US";
const CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD";

const STORE_FRONT = `${BASE.replace(/\/$/, "")}/api/storefront`;
const CART_KEY = "cartId";
export async function apiStorefront(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) headers.set("x-cart-id", stored);
  }

  const res = await fetch(`${STORE_FRONT}${path}`, {
    ...init,
    headers,
    credentials: "include", 
    cache: "no-store",
  });

  const serverCartId = res.headers.get("x-cart-id");
  if (serverCartId && typeof window !== "undefined") {
    localStorage.setItem(CART_KEY, serverCartId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

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

export function getStoredCartId() {
  return typeof window !== "undefined" ? localStorage.getItem(CART_KEY) : null;
}
export function clearStoredCartId() {
  if (typeof window !== "undefined") localStorage.removeItem(CART_KEY);
}
