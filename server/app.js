import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = dirname(currentFilePath);
  const distDir = resolve(currentDirPath, "../dist");
  const distIndexPath = resolve(distDir, "index.html");
  const hasDistBuild = existsSync(distIndexPath);

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

  if (hasDistBuild) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(distIndexPath);
    });
  }

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
