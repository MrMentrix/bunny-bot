import { getAutoMessage } from "./autoMessageStore.js";
import { AUTO_MESSAGE_TYPES } from "../config/autoMessageDefaults.js";
import { TIMER_TYPES } from "../config/timerTypes.js";
import { listNeighborhoods } from "./neighborhoodStore.js";
import { allScheduled, clearScheduled } from "./timerStore.js";

const CHECK_INTERVAL_MS = 60 * 1000;

async function fireTimer(client, guildId, timerType, scheduledAt) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const type = TIMER_TYPES[timerType];
  const template = getAutoMessage(guildId, type.autoMessageKey) ?? AUTO_MESSAGE_TYPES[type.autoMessageKey].default;
  const timeValue = type.delayHours ? scheduledAt + type.delayHours * 3600 : scheduledAt;
  const content = template.replaceAll("{time}", `<t:${timeValue}:t>`);

  for (const neighborhood of listNeighborhoods(guildId)) {
    const channelId = neighborhood[type.channelField];
    if (!channelId) continue;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    await channel.send({ content }).catch((error) => {
      console.error(`Failed to send ${timerType} to ${neighborhood.name}:`, error.message);
    });
  }
}

async function checkSchedules(client) {
  const now = Math.floor(Date.now() / 1000);

  for (const { guildId, timerType, scheduledAt } of allScheduled()) {
    if (now < scheduledAt) continue;
    await fireTimer(client, guildId, timerType, scheduledAt);
    clearScheduled(guildId, timerType);
  }
}

export function startTimerScheduler(client) {
  checkSchedules(client);
  setInterval(() => checkSchedules(client), CHECK_INTERVAL_MS);
}
