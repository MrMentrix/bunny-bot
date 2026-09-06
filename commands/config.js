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
  )
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to bind"));

function formatValue(interaction, target, id) {
  if (!id) return "*not set*";
  const cache = target.valueType === "role" ? interaction.guild.roles.cache : interaction.guild.channels.cache;
  const entity = cache.get(id);
  return entity ? `${entity} (${entity.id})` : `*missing ${target.valueType}* (${id})`;
}

async function showSettings(interaction, onlyKey) {
  const config = getGuildConfig(interaction.guildId);
  const keys = onlyKey ? [onlyKey] : Object.keys(CONFIG_TARGETS);

  const lines = keys.map(
    (key) => `**${CONFIG_TARGETS[key].label}**: ${formatValue(interaction, CONFIG_TARGETS[key], config[key])}`
  );

  await interaction.reply({ content: lines.join("\n"), flags: MessageFlags.Ephemeral });
}

export async function execute(interaction) {
  const setting = interaction.options.getString("setting");
  const action = interaction.options.getString("action");
  const channel = interaction.options.getChannel("channel");
  const role = interaction.options.getRole("role");

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

  const value = target.valueType === "role" ? role : channel;

  if (!value) {
    await interaction.reply({
      content: `Please select a ${target.valueType} to bind **${target.label}** to.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (target.valueType === "channel" && !target.channelTypes.includes(value.type)) {
    const expected = target.channelTypes.includes(ChannelType.GuildCategory) ? "category" : "text channel";
    await interaction.reply({
      content: `**${target.label}** must be bound to a ${expected}, not ${value}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setGuildValue(interaction.guildId, setting, value.id);
  await interaction.reply({
    content: `**${target.label}** has been bound to ${value}.`,
    flags: MessageFlags.Ephemeral,
  });
}
