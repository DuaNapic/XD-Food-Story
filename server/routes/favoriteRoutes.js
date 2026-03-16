import { Router } from "express";
import { asyncHandler, fail, ok } from "../lib/http.js";
import { getUserFavorites, saveUserFavorites } from "../services/favoriteService.js";
import { auditMiddleware } from "../services/auditService.js";

const router = Router();

// Apply audit log to all favorite operations
router.use(auditMiddleware("FAVORITES_OP"));

// Middleware to extract and validate session ID
const sessionGuard = (req, res, next) => {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId || sessionId.length < 8) {
    return fail(res, "UNAUTHORIZED", "Valid Session ID required in X-Session-ID header.", 401);
  }
  req.sessionId = sessionId;
  next();
};

router.get(
  "/",
  sessionGuard,
  asyncHandler(async (req, res) => {
    const favorites = await getUserFavorites(req.sessionId);
    ok(res, favorites);
  }),
);

router.post(
  "/",
  sessionGuard,
  asyncHandler(async (req, res) => {
    const { favorites } = req.body;
    const saved = await saveUserFavorites(req.sessionId, favorites || []);
    ok(res, saved);
  }),
);

export default router;
