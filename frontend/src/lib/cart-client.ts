import { apiStorefront } from "@/lib/api-client";

export type Address = {
  firstName?: string;
  lastName?: string;
  streetName?: string;
  postalCode?: string;
  city?: string;
  country: string;
};

export function getCart() {
  return apiStorefront("/cart");
}

export function addLineItem(opts: {
  productId: string;
  variantId: number;
  quantity?: number;
}) {
  return apiStorefront("/cart/line-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export function updateLineItemQuantity(opts: {
  lineItemId: string;
  quantity: number;
}) {
  return apiStorefront(`/cart/line-items/${opts.lineItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: opts.quantity }),
  });
}

export function removeLineItem(lineItemId: string) {
  return apiStorefront(`/cart/line-items/${lineItemId}`, {
    method: "DELETE",
  });
}

export function applyPromo(code: string) {
  return apiStorefront("/cart/discount-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function removePromo(codeId: string) {
  return apiStorefront(`/cart/discount-codes/${codeId}`, {
    method: "DELETE",
  });
}

export function setCartAddress(address: Address) {
  return apiStorefront("/cart/address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
}

export function getShippingMethods() {
  return apiStorefront("/cart/shipping-methods");
}

export function chooseShippingMethod(shippingMethodId: string) {
  return apiStorefront("/cart/set-shipping-method", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shippingMethodId }),
  });
}

export function getCartTotals() {
  return apiStorefront("/cart/totals");
}
