import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { BRAND_COLOR } from "../config/theme.js";

export const data = new SlashCommandBuilder()
  .setName("embed")
  .setDescription("Send or edit an embed as the bot")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("send").setDescription("Send a new embed in this channel"))
  .addSubcommand((sub) =>
    sub
      .setName("edit")
      .setDescription("Edit an embed previously sent by the bot")
      .addStringOption((opt) =>
        opt.setName("message_id").setDescription("ID of the message to edit").setRequired(true)
      )
  );

function buildEmbedModal(customId, existing) {
  const title = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Title")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(256)
    .setRequired(true);

  const text = new TextInputBuilder()
    .setCustomId("text")
    .setLabel("Text")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(true);

  const imageLink = new TextInputBuilder()
    .setCustomId("image_link")
    .setLabel("Image Link")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://... (optional)")
    .setRequired(false);

  const color = new TextInputBuilder()
    .setCustomId("color")
    .setLabel("Color (hex)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. f25ff7 — defaults to f25ff7")
    .setRequired(false);

  if (existing) {
    if (existing.title) title.setValue(existing.title);
    if (existing.description) text.setValue(existing.description);
    if (existing.image?.url) imageLink.setValue(existing.image.url);
    if (typeof existing.color === "number") color.setValue(existing.color.toString(16).padStart(6, "0"));
  }

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Embed")
    .addComponents(
      new ActionRowBuilder().addComponents(title),
      new ActionRowBuilder().addComponents(text),
      new ActionRowBuilder().addComponents(imageLink),
      new ActionRowBuilder().addComponents(color)
    );
}

function parseColor(input) {
  if (!input) return BRAND_COLOR;
  const hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return parseInt(hex, 16);
  return BRAND_COLOR;
}

function buildEmbed(fields) {
  const embed = new EmbedBuilder().setTitle(fields.title).setDescription(fields.text).setColor(parseColor(fields.color));

  if (fields.imageLink && /^https?:\/\//i.test(fields.imageLink.trim())) {
    embed.setImage(fields.imageLink.trim());
  }

  return embed;
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "send") {
    await interaction.showModal(buildEmbedModal("embed:send"));
    return;
  }

  if (subcommand === "edit") {
    const messageId = interaction.options.getString("message_id", true);
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      await interaction.reply({ content: "Message not found in this channel.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (message.author.id !== interaction.client.user.id) {
      await interaction.reply({ content: "I can only edit my own messages.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.showModal(buildEmbedModal(`embed:edit:${messageId}`, message.embeds[0]));
  }
}

export async function handleModalSubmit(interaction) {
  const fields = {
    title: interaction.fields.getTextInputValue("title"),
    text: interaction.fields.getTextInputValue("text"),
    imageLink: interaction.fields.getTextInputValue("image_link"),
    color: interaction.fields.getTextInputValue("color"),
  };
  const embed = buildEmbed(fields);
  const [, action, messageId] = interaction.customId.split(":");

  if (action === "send") {
    await interaction.channel.send({ embeds: [embed] });
    await interaction.deferUpdate();
    return;
  }

  if (action === "edit") {
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!message || message.author.id !== interaction.client.user.id) {
      await interaction.reply({ content: "That message can no longer be edited.", flags: MessageFlags.Ephemeral });
      return;
    }

    await message.edit({ content: null, embeds: [embed] });
    await interaction.deferUpdate();
  }
}
