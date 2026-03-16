import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT, IS_VERCEL } from "../config.js";

const LOG_DIR = path.join(PROJECT_ROOT, "logs");
const AUDIT_LOG_FILE = path.join(LOG_DIR, "audit.log");

// Only ensure logs directory exists and write to file if NOT on Vercel
if (!IS_VERCEL) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logAudit(action, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    action,
    ...details,
  });

  // Always log to console (Vercel captures this)
  console.log(`[AUDIT] ${action}`, details);
  
  // Skip file writing on Vercel
  if (IS_VERCEL) return;

  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logEntry + "\n", "utf8");
  } catch (error) {
    console.error("[Audit Service] Failed to write to audit log:", error);
  }
}

export function auditMiddleware(actionName) {
  return (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
      const duration = Date.now() - start;
      logAudit(actionName, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        status: res.statusCode,
        duration: `${duration}ms`,
        sessionId: req.headers["x-session-id"] || "anonymous",
      });
      originalEnd.apply(res, args);
    };
    next();
  };
}
