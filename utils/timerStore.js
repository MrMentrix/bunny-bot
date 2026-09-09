import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "timers.json");

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

export function getScheduled(guildId, timerType) {
  return (readAll()[guildId] ?? {})[timerType] ?? null;
}

export function setScheduled(guildId, timerType, scheduledAt) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  guildData[timerType] = { scheduledAt };
  all[guildId] = guildData;
  writeAll(all);
}

export function clearScheduled(guildId, timerType) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  delete guildData[timerType];
  all[guildId] = guildData;
  writeAll(all);
}

export function allScheduled() {
  const all = readAll();
  const result = [];
  for (const [guildId, timers] of Object.entries(all)) {
    for (const [timerType, entry] of Object.entries(timers)) {
      result.push({ guildId, timerType, ...entry });
    }
  }
  return result;
}
