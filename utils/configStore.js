import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "guildConfig.json");

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

export function getGuildConfig(guildId) {
  return readAll()[guildId] ?? {};
}

export function setGuildValue(guildId, key, value) {
  const all = readAll();
  all[guildId] = { ...(all[guildId] ?? {}), [key]: value };
  writeAll(all);
}

export function unsetGuildValue(guildId, key) {
  const all = readAll();
  if (all[guildId]) {
    delete all[guildId][key];
    writeAll(all);
  }
}
