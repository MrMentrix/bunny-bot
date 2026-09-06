import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from "discord.js";
import { CONFIG_TARGETS } from "../config/configTargets.js";
import { getGuildConfig, setGuildValue, unsetGuildValue } from "../utils/configStore.js";

const settingChoices = Object.entries(CONFIG_TARGETS).map(([value, target]) => ({
  name: target.label,
  value,
}));

const actionChoices = [
  { name: "bind", value: "bind" },
  { name: "unbind", value: "unbind" },
];

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("View or change server configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName("setting").setDescription("Which setting to configure").addChoices(...settingChoices)
  )
  .addStringOption((opt) =>
    opt.setName("action").setDescription("What to do with this setting").addChoices(...actionChoices)
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Channel or category to bind")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildCategory)
  );

function formatValue(guild, channelId) {
  if (!channelId) return "*not set*";
  const channel = guild.channels.cache.get(channelId);
  return channel ? `${channel} (${channel.id})` : `*missing channel* (${channelId})`;
}

async function showSettings(interaction, onlyKey) {
  const config = getGuildConfig(interaction.guildId);
  const keys = onlyKey ? [onlyKey] : Object.keys(CONFIG_TARGETS);

  const lines = keys.map((key) => `**${CONFIG_TARGETS[key].label}**: ${formatValue(interaction.guild, config[key])}`);

  await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
}

export async function execute(interaction) {
  const setting = interaction.options.getString("setting");
  const action = interaction.options.getString("action");
  const channel = interaction.options.getChannel("channel");

  if (!setting || !action) {
    await showSettings(interaction, setting ?? undefined);
    return;
  }

  const target = CONFIG_TARGETS[setting];

  if (!target.actions.includes(action)) {
    await interaction.reply({
      content: `\`${action}\` is not available for **${target.label}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "unbind") {
    unsetGuildValue(interaction.guildId, setting);
    await interaction.reply({ content: `**${target.label}** has been unbound.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (!channel) {
    await interaction.reply({
      content: `Please select a channel to bind **${target.label}** to.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!target.channelTypes.includes(channel.type)) {
    const expected = target.channelTypes.includes(ChannelType.GuildCategory) ? "category" : "text channel";
    await interaction.reply({
      content: `**${target.label}** must be bound to a ${expected}, not ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setGuildValue(interaction.guildId, setting, channel.id);
  await interaction.reply({
    content: `**${target.label}** has been bound to ${channel}.`,
    flags: MessageFlags.Ephemeral,
  });
}
