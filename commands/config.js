import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
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
  .addStringOption((opt) =>
    opt.setName("value").setDescription("Channel, category, or role to bind").setAutocomplete(true)
  );

function findMatches(guild, target, query) {
  const q = query.toLowerCase();

  if (target.valueType === "role") {
    return guild.roles.cache
      .filter((role) => role.name.toLowerCase().includes(q))
      .map((role) => ({ name: role.name, value: role.id }))
      .slice(0, 25);
  }

  return guild.channels.cache
    .filter((channel) => target.channelTypes.includes(channel.type) && channel.name.toLowerCase().includes(q))
    .map((channel) => ({ name: channel.name, value: channel.id }))
    .slice(0, 25);
}

function resolveEntity(guild, target, id) {
  const entity = target.valueType === "role" ? guild.roles.cache.get(id) : guild.channels.cache.get(id);
  if (!entity) return null;
  if (target.valueType === "channel" && !target.channelTypes.includes(entity.type)) return null;
  return entity;
}

export async function autocomplete(interaction) {
  const settingKey = interaction.options.getString("setting");
  const target = CONFIG_TARGETS[settingKey];
  const focused = interaction.options.getFocused();

  if (!target) {
    await interaction.respond([]);
    return;
  }

  await interaction.respond(findMatches(interaction.guild, target, focused));
}

function formatValue(interaction, target, id) {
  const entity = id ? resolveEntity(interaction.guild, target, id) : null;
  if (!id) return "*not set*";
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
  const rawValue = interaction.options.getString("value");

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

  if (!rawValue) {
    await interaction.reply({
      content: `Please select a ${target.valueType} to bind **${target.label}** to.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const entity = resolveEntity(interaction.guild, target, rawValue);

  if (!entity) {
    await interaction.reply({
      content: `That's not a valid selection for **${target.label}** — please pick one of the suggested options.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  setGuildValue(interaction.guildId, setting, entity.id);
  await interaction.reply({
    content: `**${target.label}** has been bound to ${entity}.`,
    flags: MessageFlags.Ephemeral,
  });
}
