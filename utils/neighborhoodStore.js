import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "neighborhoods.json");

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

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listNeighborhoods(guildId) {
  return Object.values(readAll()[guildId] ?? {});
}

export function getNeighborhood(guildId, id) {
  return (readAll()[guildId] ?? {})[id] ?? null;
}

export function createNeighborhood(guildId, { name, tag, categoryId, derbyChannelId }) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  const base = slugify(name) || "neighborhood";
  let id = base;
  let suffix = 1;
  while (guildData[id]) {
    id = `${base}-${++suffix}`;
  }

  const record = {
    id,
    name,
    tag: tag ?? null,
    categoryId: categoryId ?? null,
    derbyChannelId: derbyChannelId ?? null,
  };
  guildData[id] = record;
  all[guildId] = guildData;
  writeAll(all);
  return record;
}

export function updateNeighborhood(guildId, id, patch) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  const existing = guildData[id];
  if (!existing) return null;

  const updated = { ...existing, ...patch };
  guildData[id] = updated;
  all[guildId] = guildData;
  writeAll(all);
  return updated;
}

export function deleteNeighborhood(guildId, id) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  if (!guildData[id]) return false;

  delete guildData[id];
  all[guildId] = guildData;
  writeAll(all);
  return true;
}
