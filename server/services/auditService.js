import fs from "node:fs";
import path from "node:path";
import { PROJECT_ROOT } from "../config.js";

const LOG_DIR = path.join(PROJECT_ROOT, "logs");
const AUDIT_LOG_FILE = path.join(LOG_DIR, "audit.log");

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logAudit(action, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    action,
    ...details,
  });

  console.log(`[AUDIT] ${action}`, details);
  
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
