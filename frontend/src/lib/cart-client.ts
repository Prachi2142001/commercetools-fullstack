const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
const SF = `${BASE.replace(/\/$/, "")}/api/storefront`;

async function asJson(p: Promise<Response>) {
  const res = await p;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getCart() {
  return asJson(fetch(`${SF}/cart`, { credentials: "include", cache: "no-store" }));
}

export function addLineItem(opts: { productId: string; variantId: number; quantity?: number }) {
  return asJson(
    fetch(`${SF}/cart/line-items`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    })
  );
}

export function updateLineItemQuantity(opts: { lineItemId: string; quantity: number }) {
  return asJson(
    fetch(`${SF}/cart/line-items/${opts.lineItemId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: opts.quantity }),
    })
  );
}

export function removeLineItem(lineItemId: string) {
  return asJson(
    fetch(`${SF}/cart/line-items/${lineItemId}`, {
      method: "DELETE",
      credentials: "include",
    })
  );
}

export function applyPromo(code: string) {
  return asJson(
    fetch(`${SF}/cart/discount-codes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
  );
}

export function removePromo(codeId: string) {
  return asJson(
    fetch(`${SF}/cart/discount-codes/${codeId}`, {
      method: "DELETE",
      credentials: "include",
    })
  );
}
