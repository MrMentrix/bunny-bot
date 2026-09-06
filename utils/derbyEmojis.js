import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const mapping = JSON.parse(fs.readFileSync(path.join(root, "assets", "emoji-map.json"), "utf8"));

const byItem = new Map(mapping.map((m) => [m.item, m]));
const byEmojiId = new Map(mapping.map((m) => [m.emojiId, m]));

export function getEmojiForItem(itemName) {
  return byItem.get(itemName) ?? null;
}

export function getItemForEmojiId(emojiId) {
  return byEmojiId.get(emojiId)?.item ?? null;
}
