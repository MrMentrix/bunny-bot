import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "tickets.json");

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

export function createTicket(channelId, ticket) {
  const all = readAll();
  all[channelId] = ticket;
  writeAll(all);
}

export function getTicket(channelId) {
  return readAll()[channelId] ?? null;
}

export function deleteTicket(channelId) {
  const all = readAll();
  delete all[channelId];
  writeAll(all);
}
