import fs from "node:fs/promises";
import path from "node:path";
import { STORAGE_DIR, snippetContentPath } from "./paths.js";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function writeSnippetContent(id, content) {
  await ensureDir(STORAGE_DIR);
  await fs.writeFile(snippetContentPath(id), content, "utf8");
}

export async function readSnippetContent(id) {
  return fs.readFile(snippetContentPath(id), "utf8");
}

export async function deleteSnippetContent(id) {
  try {
    await fs.unlink(snippetContentPath(id));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

export function isExpired(snippet, now = Date.now()) {
  if (!snippet.expiresAt) return false;
  const expiresAt = new Date(snippet.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

export function isOverMaxViews(snippet) {
  if (snippet.maxViews === null || snippet.maxViews === undefined) return false;
  const maxViews = Number(snippet.maxViews);
  return Number.isFinite(maxViews) && maxViews >= 0 && snippet.views >= maxViews;
}

export function isInactive(snippet, now = Date.now()) {
  return isExpired(snippet, now) || isOverMaxViews(snippet);
}

export function getInactiveReason(snippet, now = Date.now()) {
  if (isExpired(snippet, now)) return "expired";
  if (isOverMaxViews(snippet)) return "maxViews";
  return null;
}
