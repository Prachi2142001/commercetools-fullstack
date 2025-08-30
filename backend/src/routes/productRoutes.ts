import { Router } from "express";
import {
  createProduct,
  publishProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { name, currencyCode, centAmount } = req.body || {};
    if (!name || !currencyCode || typeof centAmount !== "number") {
      return res.status(400).json({
        ok: false,
        error:
          "Required fields: name (string), currencyCode (string), centAmount (number)",
      });
    }

    const product = await createProduct(req.body);

    if (product?.masterData?.published === false) {
      const published = await publishProduct(product.id, product.version);
      return res.json({ ok: true, product: published });
    }

    res.json({ ok: true, product });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message ?? "Unknown error while creating product",
    });
  }
});


router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { version, actions } = req.body;
    const updated = await updateProduct(id, version, actions);
    res.json({ ok: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;
    const deleted = await deleteProduct(id, Number(version));
    res.json({ ok: true, product: deleted });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

export default router;
