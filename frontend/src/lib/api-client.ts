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
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    locale: LOCALE,
    currency: CURRENCY,
  });

  return apiStorefront(`/products?${query.toString()}`);
}

export async function fetchProductDetail(idOrSlug: string): Promise<ProductDetail> {
  const query = new URLSearchParams({
    locale: LOCALE,
    currency: CURRENCY,
  });

  return apiStorefront(`/products/${encodeURIComponent(idOrSlug)}?${query.toString()}`);
}

export function getStoredCartId() {
  return typeof window !== "undefined" ? localStorage.getItem(CART_KEY) : null;
}
export function clearStoredCartId() {
  if (typeof window !== "undefined") localStorage.removeItem(CART_KEY);
}
