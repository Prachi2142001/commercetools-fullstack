import { Router } from "express";
import { ctJsonGet } from "../commercetools/client";

const router = Router();

router.get("/project", async (_req, res) => {
  try {
    const project = await ctJsonGet("");
    res.json({ ok: true, project });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

export default router;
