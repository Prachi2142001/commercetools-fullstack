import { Router, Request, Response, NextFunction } from "express";
import {
  getCart,
  getCartOrNull,
  createCart,
  addLineItem,
  applyDiscountCode,
  removeDiscountCode,
  updateCart,
  setShippingAddress,
  getMatchingShippingMethodsForCart,
  setShippingMethod,
  getCartTotals,
  unsetShippingMethod,
} from "../services/cartService";

const router = Router();

type ReqWithCart = Request & { cartId?: string };

router.use(async (req: ReqWithCart, res: Response, next: NextFunction) => {
  try {
    const headerId = (
      req.get("x-cart-id") || (req.query.cartId as string | undefined)
    )?.trim();
    const cookieId = (req as any).cookies?.cartId as string | undefined;

    if (headerId) {
      const existing = await getCartOrNull(headerId);
      if (existing) {
        req.cartId = existing.id;
        res.setHeader("x-cart-id", existing.id);
        return next();
      }
    }

    if (cookieId) {
      const existing = await getCartOrNull(cookieId);
      if (existing) {
        req.cartId = existing.id;
        res.setHeader("x-cart-id", existing.id);
        return next();
      }
    }

    const created = await createCart("USD");
    res.cookie("cartId", created.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    req.cartId = created.id;
    res.setHeader("x-cart-id", created.id);
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/cart", async (req: ReqWithCart, res: Response) => {
  const cart = await getCart(req.cartId!);
  res.json(cart);
});

router.post("/cart/line-items", async (req: ReqWithCart, res: Response) => {
  const { productId, variantId, quantity = 1 } = req.body || {};
  if (!productId || !variantId) {
    return res.status(400).send("productId and variantId are required");
  }
  const cart = await getCart(req.cartId!);
  const updated = await addLineItem(
    cart,
    productId,
    Number(variantId),
    Number(quantity)
  );
  res.json(updated);
});

router.patch(
  "/cart/line-items/:lineItemId",
  async (req: ReqWithCart, res: Response) => {
    const { lineItemId } = req.params;
    const { quantity } = req.body;
    if (!lineItemId || typeof quantity !== "number") {
      return res.status(400).send("lineItemId and quantity are required");
    }
    const cart = await getCart(req.cartId!);
    const updated = await updateCart(cart, [
      { action: "changeLineItemQuantity", lineItemId, quantity },
    ]);
    const finalCart =
      (updated.totalLineItemQuantity ?? 0) === 0 && (updated as any).shippingInfo
        ? await unsetShippingMethod(updated)
        : updated;
    res.json(finalCart);
  }
);

router.delete(
  "/cart/line-items/:lineItemId",
  async (req: ReqWithCart, res: Response) => {
    const { lineItemId } = req.params;
    if (!lineItemId) return res.status(400).send("lineItemId required");
    const cart = await getCart(req.cartId!);
    const updated = await updateCart(cart, [
      { action: "removeLineItem", lineItemId },
    ]);
    const finalCart =
      (updated.totalLineItemQuantity ?? 0) === 0 && (updated as any).shippingInfo
        ? await unsetShippingMethod(updated)
        : updated;
    res.json(finalCart);
  }
);

router.post("/cart/discount-codes", async (req: ReqWithCart, res: Response) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).send("code is required");
  try {
    const cart = await getCart(req.cartId!);
    const updated = await applyDiscountCode(cart, String(code));
    res.json(updated);
  } catch (e: any) {
    res.status(400).send(e?.message || "Failed to apply discount code");
  }
});

router.delete(
  "/cart/discount-codes/:codeId",
  async (req: ReqWithCart, res: Response) => {
    const { codeId } = req.params;
    const cart = await getCart(req.cartId!);
    const updated = await removeDiscountCode(cart, String(codeId));
    res.json(updated);
  }
);

router.post("/cart/address", async (req: ReqWithCart, res: Response) => {
  try {
    const { address } = req.body || {};
    if (!address) return res.status(400).send("address is required");
    const cart = await getCart(req.cartId!);
    const updated = await setShippingAddress(cart, address);
    res.json({
      cartId: updated.id,
      version: updated.version,
      shippingAddress: (updated as any).shippingAddress ?? null,
    });
  } catch (e: any) {
    res
      .status(500)
      .json({ error: e?.message ?? "Failed to set shipping address" });
  }
});

router.get(
  "/cart/shipping-methods",
  async (req: ReqWithCart, res: Response) => {
    try {
      const methods = await getMatchingShippingMethodsForCart(req.cartId!);
      res.json(methods);
    } catch (e: any) {
      const msg = e?.message || "";
      const code = msg.includes("Set shipping address first") ? 400 : 500;
      res
        .status(code)
        .json({ error: msg || "Failed to fetch shipping methods" });
    }
  }
);

router.post(
  "/cart/set-shipping-method",
  async (req: ReqWithCart, res: Response) => {
    try {
      const { shippingMethodId } = req.body || {};
      if (!shippingMethodId) {
        return res.status(400).send("shippingMethodId is required");
      }
      const methods = await getMatchingShippingMethodsForCart(req.cartId!);
      const ok = methods.find(
        (m) => m.id === shippingMethodId && m.matchesCart
      );
      if (!ok) {
        return res.status(400).json({
          error:
            "Selected shipping method does not match this cart predicate. Ensure address country=US or adjust the method predicate.",
          methods,
        });
      }
      const cart = await getCart(req.cartId!);
      const updated = await setShippingMethod(cart, String(shippingMethodId));
      res.json({
        cartId: updated.id,
        version: updated.version,
        shippingInfo: (updated as any).shippingInfo ?? null,
        taxedPrice: (updated as any).taxedPrice ?? null,
        totalPrice: updated.totalPrice,
  });
    } catch (e: any) {
      res
        .status(500)
        .json({ error: e?.message ?? "Failed to set shipping method" });
    }
  }
);

router.get("/cart/totals", async (req: ReqWithCart, res: Response) => {
  try {
    const totals = await getCartTotals(req.cartId!);
    res.json(totals);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to get totals" });
  }
});

router.post(
  "/cart/unset-shipping-method",
  async (req: ReqWithCart, res: Response) => {
    try {
      const cart = await getCart(req.cartId!);
      const updated = await unsetShippingMethod(cart);
      res.json({
        cartId: updated.id,
        version: updated.version,
        shippingInfo: (updated as any).shippingInfo ?? null,
        taxedPrice: (updated as any).taxedPrice ?? null,
        totalPrice: updated.totalPrice,
      });
    } catch (e: any) {
      res
        .status(500)
        .json({ error: e?.message ?? "Failed to unset shipping method" });
    }
  }
);

export default router;
