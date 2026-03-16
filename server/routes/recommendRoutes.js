import { Router } from "express";
import { asyncHandler, fail, ok } from "../lib/http.js";
import { rateLimit } from "express-rate-limit";
import { explainItems } from "../services/explanationService.js";
import { parseIntent } from "../services/intentParser.js";
import { searchRecommendations } from "../services/recommendationService.js";
import { unifiedRecommendStream } from "../services/unifiedRecommender.js";
import { auditMiddleware } from "../services/auditService.js";

const router = Router();

router.use(auditMiddleware("AI_RECOMMEND_OP"));

// AI Recommendation Rate Limiter: 5 requests per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "AI recommendation frequency limit reached. Please wait a minute." } }
});

router.post(
  "/stream",
  aiLimiter,
  asyncHandler(async (req, res) => {
    const { query, conversation_history = [], top_k = 5 } = req.body;
    console.log(`[recommendRoutes] Incoming stream request: "${query}"`);

    if (!query) {
      return fail(res, "Query is required", 400);
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = unifiedRecommendStream(query, conversation_history);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("[recommendRoutes] Stream error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
      res.end();
    }
  }),
);

function buildContextualQuery(query, history) {
  if (!Array.isArray(history) || history.length === 0) {
    return String(query || "").trim();
  }

  const normalizedHistory = history
    .slice(-8)
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (!entry || typeof entry !== "object") {
        return "";
      }

      const role =
        entry.role === "ai" || entry.role === "assistant"
          ? "AI"
          : entry.role === "user"
            ? "用户"
            : "上下文";
      const text = String(entry.text || entry.content || "").trim();
      return text ? `${role}: ${text}` : "";
    })
    .filter(Boolean);

  const latestQuery = String(query || "").trim();
  const parts = normalizedHistory.length
    ? [
        "以下是最近对话上下文，请结合上下文理解用户当前追问：",
        ...normalizedHistory,
        `当前用户问题：${latestQuery}`,
      ]
    : [latestQuery];

  return parts.join("\n");
}

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
      conversation_history: conversationHistory = [],
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

    const contextualQuery = buildContextualQuery(query, conversationHistory);
    const parsed = await parseIntent(query, topK, conversationHistory);
    const result = await searchRecommendations(parsed.intent, {
      debug: Boolean(debug),
    });
    const explanation = includeExplanations
      ? await explainItems(
          contextualQuery,
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
