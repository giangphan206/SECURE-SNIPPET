import fs from "node:fs/promises";
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/authorization.js";
import {
  deleteSnippetContent,
  ensureDir,
  isExpired,
  isInactive,
  readJson,
  writeJson,
} from "../utils/fileHelpers.js";
import { CLEANUP_LOG_FILE, LOGS_DIR, SNIPPETS_FILE } from "../utils/paths.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.post("/cleanup", async (req, res, next) => {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const now = Date.now();
    const expiredOrOverLimit = snippets.filter((snippet) => isInactive(snippet, now));
    const remaining = snippets.filter((snippet) => !isInactive(snippet, now));

    for (const snippet of expiredOrOverLimit) {
      await deleteSnippetContent(snippet.id);
    }

    await writeJson(SNIPPETS_FILE, remaining);

    const report = {
      timestamp: new Date().toISOString(),
      removedCount: expiredOrOverLimit.length,
      remainingCount: remaining.length,
      removedSnippets: expiredOrOverLimit.map((snippet) => ({
        id: snippet.id,
        title: snippet.title,
        author: snippet.author,
        reason: isExpired(snippet, now) ? "expired" : "maxViews",
        views: snippet.views,
        maxViews: snippet.maxViews,
        expiresAt: snippet.expiresAt,
      })),
    };

    await ensureDir(LOGS_DIR);
    await fs.appendFile(CLEANUP_LOG_FILE, `${JSON.stringify(report)}\n`, "utf8");

    res.json({
      message: "Cleanup completed successfully.",
      report,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const now = Date.now();
    const total = snippets.length;
    const activeSnippets = snippets.filter((snippet) => !isInactive(snippet, now));
    const expiredSnippets = snippets.filter((snippet) => isInactive(snippet, now));

    res.json({
      data: {
        total,
        active: activeSnippets.length,
        public: snippets.filter((snippet) => !snippet.isPrivate).length,
        private: snippets.filter((snippet) => snippet.isPrivate).length,
        expiredOrOverLimit: expiredSnippets.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
