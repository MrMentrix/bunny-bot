import { getAutoMessage } from "./autoMessageStore.js";
import { AUTO_MESSAGE_TYPES } from "../config/autoMessageDefaults.js";
import { listNeighborhoods } from "./neighborhoodStore.js";
import { allScheduled, clearScheduled } from "./derbyAnnouncementStore.js";

const DELAY_HOURS = 14;
const CHECK_INTERVAL_MS = 60 * 1000;

async function fireAnnouncement(client, guildId, scheduledAt) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const template = getAutoMessage(guildId, "derby-announcement") ?? AUTO_MESSAGE_TYPES["derby-announcement"].default;
  const delayEnd = scheduledAt + DELAY_HOURS * 3600;
  const content = template.replaceAll("{time}", `<t:${delayEnd}:t>`);

  for (const neighborhood of listNeighborhoods(guildId)) {
    if (!neighborhood.derbyChannelId) continue;

    const channel = await guild.channels.fetch(neighborhood.derbyChannelId).catch(() => null);
    if (!channel) continue;

    await channel.send({ content }).catch((error) => {
      console.error(`Failed to send derby announcement to ${neighborhood.name}:`, error.message);
    });
  }
}

async function checkSchedules(client) {
  const now = Math.floor(Date.now() / 1000);

  for (const { guildId, scheduledAt } of allScheduled()) {
    if (now < scheduledAt) continue;
    await fireAnnouncement(client, guildId, scheduledAt);
    clearScheduled(guildId);
  }
}

export function startDerbyAnnouncementScheduler(client) {
  checkSchedules(client);
  setInterval(() => checkSchedules(client), CHECK_INTERVAL_MS);
}
