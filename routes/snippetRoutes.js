import { Router } from "express";
import crypto from "node:crypto";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";
import { checkSnippetOwner } from "../middlewares/authorization.js";
import { validateSnippet } from "../middlewares/validateSnippet.js";
import {
  deleteSnippetContent,
  getInactiveReason,
  isInactive,
  readJson,
  readSnippetContent,
  writeJson,
  writeSnippetContent,
} from "../utils/fileHelpers.js";
import { SNIPPETS_FILE } from "../utils/paths.js";

const router = Router();

function toPublicSnippet(snippet) {
  return {
    id: snippet.id,
    title: snippet.title,
    author: snippet.author,
    isPrivate: snippet.isPrivate,
    views: snippet.views,
    maxViews: snippet.maxViews,
    expiresAt: snippet.expiresAt,
    createdAt: snippet.createdAt,
  };
}

function normalizeSnippetPayload(body, author) {
  return {
    id: crypto.randomUUID(),
    title: String(body.title).trim(),
    author,
    isPrivate: Boolean(body.isPrivate),
    views: 0,
    maxViews:
      body.maxViews === undefined || body.maxViews === null ? null : Number(body.maxViews),
    expiresAt:
      body.expiresAt === undefined || body.expiresAt === null
        ? null
        : new Date(body.expiresAt).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

router.post("/", requireAuth, validateSnippet, async (req, res, next) => {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const snippet = normalizeSnippetPayload(req.body, req.currentUser.username);
    const content = String(req.body.content);

    await writeSnippetContent(snippet.id, content);
    snippets.push(snippet);
    await writeJson(SNIPPETS_FILE, snippets);

    res.status(201).json({
      message: "Snippet created successfully.",
      data: { ...toPublicSnippet(snippet), content },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const now = Date.now();
    const data = snippets
      .filter((snippet) => !snippet.isPrivate && !isInactive(snippet, now))
      .map(toPublicSnippet);

    res.json({ data, total: data.length });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const index = snippets.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Snippet not found." });
    }

    const snippet = snippets[index];

    if (snippet.isPrivate) {
      if (!req.currentUser) {
        return res.status(401).json({ message: "Authentication required to view private snippet." });
      }
      const isOwner = req.currentUser.username === snippet.author;
      const isAdmin = req.currentUser.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You do not have permission to view this private snippet." });
      }
    }

    const reason = getInactiveReason(snippet);
    if (reason) {
      const status = 410;
      const message =
        reason === "expired"
          ? "Snippet has expired."
          : "Snippet has reached its maximum view limit.";
      return res.status(status).json({ message, reason });
    }

    snippet.views = Number(snippet.views || 0) + 1;
    snippets[index] = snippet;
    await writeJson(SNIPPETS_FILE, snippets);

    let content;
    try {
      content = await readSnippetContent(snippet.id);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({ message: "Snippet content file not found." });
      }
      throw error;
    }

    res.json({ data: { ...toPublicSnippet(snippet), content } });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, checkSnippetOwner, validateSnippet, async (req, res, next) => {
  try {
    const snippets = req.snippets;
    const snippet = req.snippet;
    const index = snippets.findIndex((item) => item.id === snippet.id);
    const { title, content, isPrivate, maxViews, expiresAt } = req.body;

    if (title !== undefined) snippet.title = String(title).trim();
    if (isPrivate !== undefined) snippet.isPrivate = Boolean(isPrivate);
    if (maxViews !== undefined) {
      snippet.maxViews = maxViews === null ? null : Number(maxViews);
    }
    if (expiresAt !== undefined) {
      snippet.expiresAt = expiresAt === null ? null : new Date(expiresAt).toISOString();
    }

    if (content !== undefined) {
      await writeSnippetContent(snippet.id, String(content));
    }

    snippets[index] = snippet;
    await writeJson(SNIPPETS_FILE, snippets);

    const responseContent =
      content !== undefined ? String(content) : await readSnippetContent(snippet.id);

    res.json({
      message: "Snippet updated successfully.",
      data: { ...toPublicSnippet(snippet), content: responseContent },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, checkSnippetOwner, async (req, res, next) => {
  try {
    const snippets = req.snippets.filter((item) => item.id !== req.params.id);
    await writeJson(SNIPPETS_FILE, snippets);
    await deleteSnippetContent(req.params.id);

    res.json({ message: "Snippet deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;
