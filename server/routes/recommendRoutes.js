import { Router } from "express";
import { asyncHandler, fail, ok } from "../lib/http.js";
import { explainItems } from "../services/explanationService.js";
import { parseIntent } from "../services/intentParser.js";
import { searchRecommendations } from "../services/recommendationService.js";

const router = Router();

router.post(
  "/parse-intent",
  asyncHandler(async (req, res) => {
    const { query, top_k: topK } = req.body ?? {};

    if (!String(query || "").trim()) {
      return fail(
        res,
        "INVALID_QUERY",
        "Query must be a non-empty string.",
        400,
      );
    }

    const parsed = await parseIntent(query, topK);
    return ok(res, parsed);
  }),
);

router.post(
  "/search",
  asyncHandler(async (req, res) => {
    const { intent, debug = false } = req.body ?? {};

    if (!intent || typeof intent !== "object") {
      return fail(res, "INVALID_INTENT", "Intent payload is required.", 400);
    }

    const result = await searchRecommendations(intent, {
      debug: Boolean(debug),
    });
    return res.json({ success: true, ...result });
  }),
);

router.post(
  "/query",
  asyncHandler(async (req, res) => {
    const {
      query,
      top_k: topK = 5,
      include_explanations: includeExplanations = true,
      debug = false,
    } = req.body ?? {};

    if (!String(query || "").trim()) {
      return fail(
        res,
        "INVALID_QUERY",
        "Query must be a non-empty string.",
        400,
      );
    }

    const parsed = await parseIntent(query, topK);
    const result = await searchRecommendations(parsed.intent, {
      debug: Boolean(debug),
    });
    const explanation = includeExplanations
      ? await explainItems(
          query,
          result.data.items,
          parsed.intent.explanation_style,
        )
      : {
          reply_text: "",
          item_explanations: [],
          meta: { explanation_source: "disabled" },
        };

    return res.json({
      success: true,
      data: {
        intent: parsed.intent,
        intent_meta: parsed.meta,
        reply_text: explanation.reply_text,
        items: result.data.items,
        item_explanations: explanation.item_explanations,
      },
      ...(result.debug
        ? {
            debug: {
              ...result.debug,
              intent_meta: parsed.meta,
              explanation_meta: explanation.meta,
            },
          }
        : {}),
    });
  }),
);

router.post(
  "/explain",
  asyncHandler(async (req, res) => {
    const { query, item_ids: itemIds = [], style = "campus" } = req.body ?? {};

    if (!String(query || "").trim()) {
      return fail(
        res,
        "INVALID_QUERY",
        "Query must be a non-empty string.",
        400,
      );
    }

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return fail(
        res,
        "BAD_REQUEST",
        "item_ids must be a non-empty array.",
        400,
      );
    }

    const parsed = await parseIntent(query, itemIds.length);
    const result = await searchRecommendations(parsed.intent, { debug: false });
    const filtered = result.data.items.filter((entry) =>
      itemIds.includes(entry.item.id),
    );
    const explanation = await explainItems(query, filtered, style);

    return ok(res, explanation);
  }),
);

export default router;
