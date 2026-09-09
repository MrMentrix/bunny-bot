import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";
import { AUTO_MESSAGE_TYPES } from "../config/autoMessageDefaults.js";
import { getAutoMessage, setAutoMessage } from "../utils/autoMessageStore.js";

const choices = Object.entries(AUTO_MESSAGE_TYPES).map(([value, type]) => ({ name: type.label, value }));

export const data = new SlashCommandBuilder()
  .setName("auto-message")
  .setDescription("Edit an automatic ticket/announcement message")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName("selection").setDescription("Which message to edit").setRequired(true).addChoices(...choices)
  );

export async function execute(interaction) {
  const key = interaction.options.getString("selection", true);
  const type = AUTO_MESSAGE_TYPES[key];
  const current = (getAutoMessage(interaction.guildId, key) ?? type.default).slice(0, 4000);

  const input = new TextInputBuilder()
    .setCustomId("message")
    .setLabel(`${type.label} message`)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(current)
    .setMaxLength(4000)
    .setRequired(true);

  const modal = new ModalBuilder()
    .setCustomId(`auto-message:modal:${key}`)
    .setTitle(`Edit: ${type.label}`)
    .addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction) {
  const [, action, key] = interaction.customId.split(":");
  if (action !== "modal") return;

  const text = interaction.fields.getTextInputValue("message");
  setAutoMessage(interaction.guildId, key, text);

  await interaction.reply({
    content: `${AUTO_MESSAGE_TYPES[key].label} message updated.`,
    flags: MessageFlags.Ephemeral,
  });
}
