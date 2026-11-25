import { readJson } from "../utils/fileHelpers.js";
import { USERS_FILE } from "../utils/paths.js";

async function findUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const users = await readJson(USERS_FILE, []);
  return users.find((user) => user.apiKey === apiKey) || null;
}

export async function optionalAuth(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");
    req.currentUser = await findUserByApiKey(apiKey);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");
    if (!apiKey) {
      return res.status(401).json({ message: "Missing x-api-key header." });
    }

    const user = await findUserByApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: "Invalid x-api-key." });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
