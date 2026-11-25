import fs from "node:fs/promises";
import { ensureDir } from "../utils/fileHelpers.js";
import { ACCESS_LOG_FILE, LOGS_DIR } from "../utils/paths.js";

export async function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", async () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const line = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms\n`;
    try {
      await ensureDir(LOGS_DIR);
      await fs.appendFile(ACCESS_LOG_FILE, line, "utf8");
    } catch (error) {
      console.error("Failed to write access log:", error.message);
    }
  });

  next();
}
