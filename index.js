import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startTicketReminderScheduler } from "./utils/ticketReminder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startTicketReminderScheduler(readyClient);
});

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
