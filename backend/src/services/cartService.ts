import { ctJsonGet, ctJsonPost, ctJsonGetOrNull } from "../commercetools/client";
import type { Cart, CartUpdateAction } from "@commercetools/platform-sdk";

export async function getCart(cartId: string): Promise<Cart> {
  return ctJsonGet<Cart>(`/carts/${cartId}`);
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
  return updateCart(cart, [{ action: "addLineItem", productId, variantId, quantity }]);
}

export async function applyDiscountCode(cart: Cart, code: string): Promise<Cart> {
  return updateCart(cart, [{ action: "addDiscountCode", code }]);
}

export async function removeDiscountCode(cart: Cart, codeId: string): Promise<Cart> {
  return updateCart(cart, [
    { action: "removeDiscountCode", discountCode: { typeId: "discount-code", id: codeId } },
  ]);
}
