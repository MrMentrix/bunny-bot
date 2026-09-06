import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("message")
  .setDescription("Send or edit a message as the bot")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("send").setDescription("Send a new message in this channel"))
  .addSubcommand((sub) =>
    sub
      .setName("edit")
      .setDescription("Edit a message previously sent by the bot")
      .addStringOption((opt) =>
        opt.setName("message_id").setDescription("ID of the message to edit").setRequired(true)
      )
  );

function buildTextModal(customId, defaultValue) {
  const input = new TextInputBuilder()
    .setCustomId("message_content")
    .setLabel("Message")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(2000)
    .setRequired(true);

  if (defaultValue) input.setValue(defaultValue);

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Message")
    .addComponents(new ActionRowBuilder().addComponents(input));
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "send") {
    await interaction.showModal(buildTextModal("message:send"));
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

    await interaction.showModal(buildTextModal(`message:edit:${messageId}`, message.content));
  }
}

export async function handleModalSubmit(interaction) {
  const content = interaction.fields.getTextInputValue("message_content");
  const [, action, messageId] = interaction.customId.split(":");

  if (action === "send") {
    await interaction.channel.send({ content });
    await interaction.deferUpdate();
    return;
  }

  if (action === "edit") {
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);

    if (!message || message.author.id !== interaction.client.user.id) {
      await interaction.reply({ content: "That message can no longer be edited.", flags: MessageFlags.Ephemeral });
      return;
    }

    await message.edit({ content });
    await interaction.deferUpdate();
  }
}
