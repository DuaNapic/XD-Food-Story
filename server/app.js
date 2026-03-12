import cors from "cors";
import express from "express";
import { LLM_ENABLED } from "./config.js";
import metaRoutes from "./routes/metaRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import recommendRoutes from "./routes/recommendRoutes.js";
import { fail } from "./lib/http.js";
import { getCurrentTimeContext } from "./services/timeContext.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      data: {
        status: "ok",
        llm_enabled: LLM_ENABLED,
        time_context: getCurrentTimeContext(),
      },
    });
  });

  app.use("/api/meta", metaRoutes);
  app.use("/api/menus", menuRoutes);
  app.use("/api/recommend", recommendRoutes);

  app.use((req, res) => {
    fail(res, "NOT_FOUND", "Route not found.", 404, { path: req.path });
  });

  app.use((error, _req, res, _next) => {
    console.error("[api-error]", error?.stack || error?.message || error);

    if (error instanceof SyntaxError) {
      return fail(res, "BAD_REQUEST", "Invalid JSON body.", 400);
    }

    if (String(error.message || "").includes("data source")) {
      return fail(res, "DATA_SOURCE_ERROR", error.message, 500);
    }

    return fail(
      res,
      "INTERNAL_ERROR",
      error.message || "Unexpected server error.",
      500,
    );
  });

  return app;
}
