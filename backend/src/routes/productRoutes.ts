import { Router } from "express";
import { createProduct, publishProduct } from "../services/productService";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, currencyCode, centAmount } = req.body || {};
    if (!name || !currencyCode || typeof centAmount !== "number") {
      return res.status(400).json({
        ok: false,
        error: "Required fields: name (string), currencyCode (string), centAmount (number)",
      });
    }

    const product = await createProduct(req.body);

    if (product?.masterData?.published === false) {
      const published = await publishProduct(product.id, product.version);
      return res.json({ ok: true, product: published });
    }

    res.json({ ok: true, product });
  } catch (err: any) {
    res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Unknown error while creating product" });
  }
});

export default router;
