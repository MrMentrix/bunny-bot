import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const filePath = path.join(dataDir, "tickets.json");
const countersPath = path.join(dataDir, "ticketCounters.json");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(file, data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function createTicket(channelId, ticket) {
  const all = readJson(filePath);
  all[channelId] = ticket;
  writeJson(filePath, all);
}

export function getTicket(channelId) {
  return readJson(filePath)[channelId] ?? null;
}

export function getAllTickets() {
  return readJson(filePath);
}

export function deleteTicket(channelId) {
  const all = readJson(filePath);
  delete all[channelId];
  writeJson(filePath, all);
}

export function nextTicketNumber(guildId, prefix) {
  const counters = readJson(countersPath);
  const key = `${guildId}:${prefix}`;
  const next = (counters[key] ?? 0) + 1;
  counters[key] = next;
  writeJson(countersPath, counters);
  return next;
}
