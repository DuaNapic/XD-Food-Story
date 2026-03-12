import { Router } from "express";
import { asyncHandler, fail, ok } from "../lib/http.js";
import { getMenuDetail, listMenus } from "../services/menuService.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await listMenus(req.query);
    ok(res, result);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await getMenuDetail(req.params.id);

    if (!item) {
      return fail(res, "NOT_FOUND", "Menu item not found.", 404, {
        id: req.params.id,
      });
    }

    return ok(res, { item });
  }),
);

export default router;
