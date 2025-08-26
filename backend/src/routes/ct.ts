import { Router } from "express";
import { ctGet } from "../ct/client";

const router = Router();

router.get("/project", async (_req, res) => {
  try {
    const project = await ctGet("");
    res.json({ ok: true, project });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? "Unknown error" });
  }
});

export default router;
