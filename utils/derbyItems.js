import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

export const CHUNK_SIZE = 20;

let cachedItems = null;

export function loadDerbyItems() {
  if (!cachedItems) {
    cachedItems = JSON.parse(fs.readFileSync(path.join(root, "assets", "derby-max-tasks.json"), "utf8"));
  }
  return cachedItems;
}

export function loadDerbyChunks() {
  const items = loadDerbyItems();
  const chunks = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}
