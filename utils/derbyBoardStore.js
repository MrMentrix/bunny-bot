import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "derbyBoards.json");

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

export function getBoard(guildId, neighborhoodId) {
  return (readAll()[guildId] ?? {})[neighborhoodId] ?? null;
}

export function setBoard(guildId, neighborhoodId, images) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  guildData[neighborhoodId] = images;
  all[guildId] = guildData;
  writeAll(all);
}

export function deleteBoard(guildId, neighborhoodId) {
  const all = readAll();
  const guildData = all[guildId] ?? {};
  if (!guildData[neighborhoodId]) return false;
  delete guildData[neighborhoodId];
  all[guildId] = guildData;
  writeAll(all);
  return true;
}

export function findByMessageId(messageId) {
  const all = readAll();
  for (const [guildId, neighborhoods] of Object.entries(all)) {
    for (const [neighborhoodId, images] of Object.entries(neighborhoods)) {
      const image = images.find((img) => img.messageId === messageId);
      if (image) return { guildId, neighborhoodId, chunkIndex: image.chunkIndex };
    }
  }
  return null;
}

export function allBoards() {
  const all = readAll();
  const result = [];
  for (const [guildId, neighborhoods] of Object.entries(all)) {
    for (const [neighborhoodId, images] of Object.entries(neighborhoods)) {
      result.push({ guildId, neighborhoodId, images });
    }
  }
  return result;
}
