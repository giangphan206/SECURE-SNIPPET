import { readJson } from "../utils/fileHelpers.js";
import { SNIPPETS_FILE } from "../utils/paths.js";

export function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}

export async function checkSnippetOwner(req, res, next) {
  try {
    const snippets = await readJson(SNIPPETS_FILE, []);
    const snippet = snippets.find((item) => item.id === req.params.id);

    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found." });
    }

    const user = req.currentUser;
    const isOwner = user && user.username === snippet.author;
    const isAdmin = user && user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only the snippet author or an admin can modify this snippet." });
    }

    req.snippet = snippet;
    req.snippets = snippets;
    next();
  } catch (error) {
    next(error);
  }
}
