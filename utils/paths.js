import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const STORAGE_DIR = path.join(ROOT_DIR, "storage");
export const LOGS_DIR = path.join(ROOT_DIR, "logs");

export const SNIPPETS_FILE = path.join(DATA_DIR, "snippets.json");
export const USERS_FILE = path.join(DATA_DIR, "users.json");
export const ACCESS_LOG_FILE = path.join(LOGS_DIR, "access.log");
export const CLEANUP_LOG_FILE = path.join(LOGS_DIR, "cleanup.log");

export function snippetContentPath(id) {
  return path.join(STORAGE_DIR, `${id}.txt`);
}
