import {
  ctJsonGet,
  ctJsonPost,
  ctJsonGetOrNull,
} from "../commercetools/client";
import type {
  Cart,
  CartUpdateAction,
  Address,
  ShippingMethod,
  TypedMoney,
} from "@commercetools/platform-sdk";

export async function getCart(cartId: string): Promise<Cart> {
  return ctJsonGet<Cart>(
    `/carts/${cartId}?expand=discountCodes[*].discountCode`
  );
}

export async function getCartOrNull(cartId: string): Promise<Cart | null> {
  return ctJsonGetOrNull<Cart>(`/carts/${cartId}`);
}

export async function createCart(currency = "USD"): Promise<Cart> {
  return ctJsonPost<Cart>("/carts", { currency });
}

export async function updateCart(
  cart: Cart,
  actions: CartUpdateAction[],
  maxRetries = 2
): Promise<Cart> {
  let current = cart;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const updated = await ctJsonPost<Cart>(`/carts/${current.id}`, {
        version: current.version,
        actions,
      });
      return updated;
    } catch (err: any) {
      if (i < maxRetries) {
        current = await getCart(current.id);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to update cart after retries");
}

export async function addLineItem(
  cart: Cart,
  productId: string,
  variantId: number,
  quantity = 1
): Promise<Cart> {
  return updateCart(cart, [
    { action: "addLineItem", productId, variantId, quantity },
    { action: "recalculate", updateProductData: false },
  ]);
}

export async function applyDiscountCode(
  cart: Cart,
  code: string
): Promise<Cart> {
  return updateCart(cart, [{ action: "addDiscountCode", code }]);
}

export async function removeDiscountCode(
  cart: Cart,
  codeId: string
): Promise<Cart> {
  return updateCart(cart, [
    {
      action: "removeDiscountCode",
      discountCode: { typeId: "discount-code", id: codeId },
    },
  ]);
}

function pickMoney(m?: Partial<TypedMoney> | null) {
  if (!m || typeof (m as any).centAmount !== "number") return null;
  const money = m as TypedMoney;
  return {
    centAmount: money.centAmount,
    currencyCode: money.currencyCode,
    fractionDigits:
      (money as any).fractionDigits ?? (money as any).preciseAmount ? 2 : 2,
  };
}

export async function setShippingAddress(cart: Cart, address: Address): Promise<Cart> {
  const normalized: Address = {
    ...address,
    country: (address.country || "").toUpperCase(),
  };
  return updateCart(cart, [{ action: "setShippingAddress", address: normalized }]);
}

export async function setShippingMethod(cart: Cart, shippingMethodId: string): Promise<Cart> {
  return updateCart(cart, [
    {
      action: "setShippingMethod",
      shippingMethod: { typeId: "shipping-method", id: shippingMethodId },
    },
    { action: "recalculate", updateProductData: false },
  ]);
}

export async function unsetShippingMethod(cart: Cart): Promise<Cart> {
  return updateCart(cart, [
    { action: "setShippingMethod", shippingMethod: null as any },
    { action: "recalculate", updateProductData: false },
  ]);
}

export type SimplifiedShippingMethod = {
  id: string;
  name: string;
  description: string | null;
  price: { centAmount: number; currencyCode: string; fractionDigits?: number } | null;
  freeAbove: { centAmount: number; currencyCode: string; fractionDigits?: number } | null;
  matchesCart: boolean; 
};

export async function getMatchingShippingMethodsForCart(
  cartId: string
): Promise<SimplifiedShippingMethod[]> {
  const cart = await getCart(cartId);
  const country = String((cart as any).shippingAddress?.country || "").toUpperCase();
  if (!country) throw new Error("Set shipping address first (country is required).");
  const { results } = await ctJsonGet<{ results: ShippingMethod[] }>(
    `/shipping-methods/matching-cart?cartId=${encodeURIComponent(cartId)}`
  );
  const currency = cart.totalPrice?.currencyCode || "USD";
  return (results || []).map((m) => {
    const zoneRates = m.zoneRates ?? [];
    const shippingRates = zoneRates.flatMap((zr) => zr.shippingRates ?? []);
    const priceCandidates = shippingRates
      .map((sr) => sr.price)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => p.currencyCode === currency);
    const price =
      priceCandidates[0] ?? zoneRates[0]?.shippingRates?.[0]?.price ?? null;
    const freeAbove = zoneRates[0]?.shippingRates?.[0]?.freeAbove ?? null;
    return {
      id: m.id,
      name: m.name,
      description:
        (m as any).localizedDescription ?? (m as any).description ?? null,
      price: price ? { centAmount: price.centAmount, currencyCode: price.currencyCode, fractionDigits: 2 } : null,
      freeAbove: freeAbove
        ? { centAmount: freeAbove.centAmount, currencyCode: freeAbove.currencyCode, fractionDigits: 2 }
        : null,
      matchesCart: true,
    };
  });
}

export function getNormalizedTotals(cart: Cart) {
  const currency = cart.totalPrice?.currencyCode || "USD";
  const lineItems = Array.isArray(cart.lineItems) ? cart.lineItems : [];
  const itemsSubtotalCents = lineItems.reduce(
    (sum, li) => sum + (li.totalPrice?.centAmount ?? 0),
    0
  );

  if (itemsSubtotalCents === 0) {
    return {
      currency,
      subtotal: { centAmount: 0, currencyCode: currency, fractionDigits: 2 },
      shipping: { centAmount: 0, currencyCode: currency, fractionDigits: 2 },
      tax: { centAmount: 0, currencyCode: currency, fractionDigits: 2 },
      total: { centAmount: 0, currencyCode: currency, fractionDigits: 2 },
    };
  }

  const shippingPrice = cart.shippingInfo?.price ?? null;
  const shippingMoney =
    pickMoney(shippingPrice) ??
    { centAmount: 0, currencyCode: currency, fractionDigits: 2 };

  const totalTax =
    (cart as any).taxedPrice?.totalTax ??
    { centAmount: 0, currencyCode: currency, fractionDigits: 2 };

  const subtotalMoney = {
    centAmount: itemsSubtotalCents,
    currencyCode: currency,
    fractionDigits: 2,
  };

  const taxMoney = pickMoney(totalTax) ?? {
    centAmount: 0,
    currencyCode: currency,
    fractionDigits: 2,
  };

  const totalCents =
    subtotalMoney.centAmount +
    (shippingMoney?.centAmount ?? 0) +
    (taxMoney?.centAmount ?? 0);

  return {
    currency,
    subtotal: subtotalMoney,
    shipping: shippingMoney,
    tax: taxMoney,
    total: { centAmount: totalCents, currencyCode: currency, fractionDigits: 2 },
  };
}

export async function getCartTotals(cartId: string) {
  const cart = await getCart(cartId);
  return getNormalizedTotals(cart);
}
