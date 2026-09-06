import { getAllTickets, deleteTicket } from "./ticketStore.js";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

async function checkTicket(client, channelId, ticket) {
  const guild = client.guilds.cache.get(ticket.guildId);
  const channel = guild?.channels.cache.get(channelId);

  if (!channel) {
    deleteTicket(channelId);
    return;
  }

  const recent = await channel.messages.fetch({ limit: 1 });
  const lastMessage = recent.first();
  const lastActivity = lastMessage ? lastMessage.createdTimestamp : ticket.createdAt;

  if (Date.now() - lastActivity < STALE_THRESHOLD_MS) return;

  await channel.send({
    content: `<@${ticket.creatorId}>, just checking in — do you still have open questions here?`,
    allowedMentions: { users: [ticket.creatorId] },
  });
}

async function checkAllTickets(client) {
  const tickets = getAllTickets();

  for (const [channelId, ticket] of Object.entries(tickets)) {
    try {
      await checkTicket(client, channelId, ticket);
    } catch (error) {
      console.error(`Failed to check ticket ${channelId}:`, error);
    }
  }
}

export function startTicketReminderScheduler(client) {
  checkAllTickets(client);
  setInterval(() => checkAllTickets(client), CHECK_INTERVAL_MS);
}
