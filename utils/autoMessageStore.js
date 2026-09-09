import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "autoMessages.json");

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeAll(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getAutoMessage(guildId, key) {
  return (readAll()[guildId] ?? {})[key] ?? null;
}

export function setAutoMessage(guildId, key, text) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  guildData[key] = text;
  all[guildId] = guildData;
  writeAll(all);
}
