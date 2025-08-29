import { Router, Request, Response, NextFunction } from "express";
import {
  getCart,
  getCartOrNull,
  createCart,
  addLineItem,
  applyDiscountCode,
  removeDiscountCode,
  updateCart,
} from "../services/cartService";

const router = Router();

type ReqWithCart = Request & { cartId?: string };

// Middleware to get or create cart and set cartId cookie
router.use(async (req: ReqWithCart, res: Response, next: NextFunction) => {
  try {
    const cookieId = (req as any).cookies?.cartId as string | undefined;
    if (cookieId) {
      const existing = await getCartOrNull(cookieId);
      if (existing) {
        req.cartId = existing.id;
        return next();
      }
    }
    const created = await createCart("USD");
    res.cookie("cartId", created.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    req.cartId = created.id;
    next();
  } catch (err) {
    next(err);
  }
});

// GET cart
router.get("/cart", async (req: ReqWithCart, res: Response) => {
  const cart = await getCart(req.cartId!);
  res.json(cart);
});

// POST add line item
router.post("/cart/line-items", async (req: ReqWithCart, res: Response) => {
  const { productId, variantId, quantity = 1 } = req.body || {};
  if (!productId || !variantId) {
    return res.status(400).send("productId and variantId are required");
  }

  const cart = await getCart(req.cartId!);
  const updated = await addLineItem(cart, productId, Number(variantId), Number(quantity));
  res.json(updated);
});

// PATCH update line item quantity
router.patch("/cart/line-items/:lineItemId", async (req: ReqWithCart, res: Response) => {
  const { lineItemId } = req.params;
  const { quantity } = req.body;
  if (!lineItemId || typeof quantity !== "number") {
    return res.status(400).send("lineItemId and quantity are required");
  }
  const cart = await getCart(req.cartId!);
  const updated = await updateCart(cart, [
    { action: "changeLineItemQuantity", lineItemId, quantity },
  ]);
  res.json(updated);
});

// DELETE remove line item
router.delete("/cart/line-items/:lineItemId", async (req: ReqWithCart, res: Response) => {
  const { lineItemId } = req.params;
  if (!lineItemId) return res.status(400).send("lineItemId required");
  const cart = await getCart(req.cartId!);
  const updated = await updateCart(cart, [{ action: "removeLineItem", lineItemId }]);
  res.json(updated);
});

// POST apply discount code
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

// DELETE remove discount code
router.delete("/cart/discount-codes/:codeId", async (req: ReqWithCart, res: Response) => {
  const { codeId } = req.params;
  const cart = await getCart(req.cartId!);
  const updated = await removeDiscountCode(cart, String(codeId));
  res.json(updated);
});

export default router;
