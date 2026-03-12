import { Router } from "express";
import { asyncHandler, ok } from "../lib/http.js";
import { getMeta } from "../services/menuService.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const meta = await getMeta();
    ok(res, meta);
  }),
);

export default router;
