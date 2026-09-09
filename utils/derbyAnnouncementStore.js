import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "derbyAnnouncement.json");

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

export function getScheduled(guildId) {
  return readAll()[guildId] ?? null;
}

export function setScheduled(guildId, scheduledAt) {
  const all = readAll();
  all[guildId] = { scheduledAt };
  writeAll(all);
}

export function clearScheduled(guildId) {
  const all = readAll();
  delete all[guildId];
  writeAll(all);
}

export function allScheduled() {
  return Object.entries(readAll()).map(([guildId, entry]) => ({ guildId, ...entry }));
}
