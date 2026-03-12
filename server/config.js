import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = __dirname;
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, "..");
export const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, "..");
export const DATA_FILE_PATH = path.join(
  WORKSPACE_ROOT,
  "recommended_menus_frontend_ui.json",
);
export const PORT = Number(process.env.PORT || 3001);
export const SERVER_TIMEZONE = process.env.SERVER_TIMEZONE || "Asia/Shanghai";

export const LLM_API_KEY =
  process.env.LLM_API_KEY ||
  process.env.DASHSCOPE_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "";
export const LLM_BASE_URL = (
  process.env.LLM_BASE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1"
).replace(/\/+$/, "");
export const LLM_MODEL = process.env.LLM_MODEL || "qwen3.5-plus";
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);
export const LLM_ENABLE_THINKING =
  String(process.env.LLM_ENABLE_THINKING || "false").toLowerCase() === "true";
export const LLM_ENABLED = Boolean(LLM_API_KEY);
