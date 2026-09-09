import { Client, Collection, Events, GatewayIntentBits, Partials, MessageFlags } from "discord.js";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startTicketReminderScheduler } from "./utils/ticketReminder.js";
import { startDerbyAnnouncementScheduler } from "./utils/derbyAnnouncementScheduler.js";
import { refreshDerbyImage } from "./utils/derbyBoard.js";
import { allBoards, findByMessageId } from "./utils/derbyBoardStore.js";
import { getNeighborhood } from "./utils/neighborhoodStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Reaction, Partials.Channel],
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

async function recacheDerbyBoards(readyClient) {
  for (const { guildId, neighborhoodId, images } of allBoards()) {
    const guild = readyClient.guilds.cache.get(guildId);
    if (!guild) continue;

    const neighborhood = getNeighborhood(guildId, neighborhoodId);
    if (!neighborhood?.derbyChannelId) continue;

    const channel = await guild.channels.fetch(neighborhood.derbyChannelId).catch(() => null);
    if (!channel) continue;

    for (const img of images) {
      try {
        const message = await channel.messages.fetch(img.messageId);
        await refreshDerbyImage(message);
      } catch (error) {
        console.error(`Failed to re-cache derby board message ${img.messageId}:`, error.message);
      }
    }
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startTicketReminderScheduler(readyClient);
  startDerbyAnnouncementScheduler(readyClient);
  await recacheDerbyBoards(readyClient);
});

async function handleDerbyReactionChange(reaction, user) {
  if (user.id === reaction.client.user.id) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (!findByMessageId(reaction.message.id)) return;
    await refreshDerbyImage(reaction.message);
  } catch (error) {
    console.error("Failed to refresh derby board image:", error);
  }
}

client.on(Events.MessageReactionAdd, handleDerbyReactionChange);
client.on(Events.MessageReactionRemove, handleDerbyReactionChange);

async function replyWithError(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await replyWithError(interaction, "Something went wrong while running this command.");
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  if (interaction.isButton()) {
    const [commandName] = interaction.customId.split(":");
    const command = client.commands.get(commandName);
    if (!command?.handleButton) return;

    try {
      await command.handleButton(interaction);
    } catch (error) {
      console.error(error);
      await replyWithError(interaction, "Something went wrong.");
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    const [commandName] = interaction.customId.split(":");
    const command = client.commands.get(commandName);
    if (!command?.handleModalSubmit) return;

    try {
      await command.handleModalSubmit(interaction);
    } catch (error) {
      console.error(error);
      await replyWithError(interaction, "Something went wrong.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
