import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  AttachmentBuilder,
  MessageFlags,
} from "discord.js";
import { TICKET_TYPES } from "../config/ticketTypes.js";
import { BRAND_COLOR } from "../config/theme.js";
import { getGuildConfig } from "../utils/configStore.js";
import { createTicket, getTicket, deleteTicket, nextTicketNumber } from "../utils/ticketStore.js";

export const data = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Manage the ticket system")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) => sub.setName("panel").setDescription("Post the ticket panel in the configured Tickets Panel channel"));

function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle("Need help?")
    .setDescription("Select an option below to open a ticket.")
    .setColor(BRAND_COLOR);

  const row = new ActionRowBuilder().addComponents(
    Object.entries(TICKET_TYPES).map(([key, type]) =>
      new ButtonBuilder().setCustomId(`ticket:create:${key}`).setLabel(type.label).setStyle(ButtonStyle.Primary)
    )
  );

  return { embeds: [embed], components: [row] };
}

function buildApplicationModal() {
  const intro = new TextInputBuilder()
    .setCustomId("intro")
    .setLabel("Introduce yourself, age, where you're from")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const farmName = new TextInputBuilder()
    .setCustomId("farm_name")
    .setLabel("Farm Name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Greg's Farm")
    .setRequired(true);

  const farmLevel = new TextInputBuilder()
    .setCustomId("farm_level")
    .setLabel("Farm Level (numbers only)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 69")
    .setRequired(true);

  const farmTag = new TextInputBuilder()
    .setCustomId("farm_tag")
    .setLabel("Farm Tag")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. #ABC123XYZ")
    .setRequired(true);

  const neighborhood = new TextInputBuilder()
    .setCustomId("neighborhood")
    .setLabel("Current/Previous Neighborhood, Name + Tag")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Current: Bunny Burrow / #ABC123DEF\nPrevious: Golden Meadow / #QVW789XYZ")
    .setMaxLength(300)
    .setRequired(true);

  return new ModalBuilder()
    .setTitle("🐰 Hay Day Application")
    .addComponents(
      new ActionRowBuilder().addComponents(intro),
      new ActionRowBuilder().addComponents(farmName),
      new ActionRowBuilder().addComponents(farmLevel),
      new ActionRowBuilder().addComponents(farmTag),
      new ActionRowBuilder().addComponents(neighborhood)
    );
}

function extractApplicationAnswers(fields) {
  return {
    intro: fields.getTextInputValue("intro"),
    farmName: fields.getTextInputValue("farm_name"),
    farmLevel: fields.getTextInputValue("farm_level"),
    farmTag: fields.getTextInputValue("farm_tag"),
    neighborhood: fields.getTextInputValue("neighborhood"),
  };
}

function buildApplicationEmbed(applicant, answers) {
  return new EmbedBuilder()
    .setTitle("🐰 New Farm Application! 🥕")
    .setColor(BRAND_COLOR)
    .setThumbnail(applicant.displayAvatarURL())
    .addFields(
      { name: "🌸 About", value: answers.intro },
      { name: "🚜 Farm Name", value: answers.farmName, inline: true },
      { name: "⭐ Farm Level", value: answers.farmLevel, inline: true },
      { name: "🏷️ Farm Tag", value: answers.farmTag, inline: true },
      { name: "🏘️ Neighborhood", value: answers.neighborhood }
    )
    .setFooter({ text: "Hop to it — a moderator will be with you soon! 🐾" })
    .setTimestamp();
}

function buildGiveawayModal() {
  const description = new TextInputBuilder()
    .setCustomId("description")
    .setLabel("What do you want to give away?")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const targetGroup = new TextInputBuilder()
    .setCustomId("target_group")
    .setLabel("Target Group")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Own Neighborhood or All Neighborhoods")
    .setRequired(true);

  const duration = new TextInputBuilder()
    .setCustomId("duration")
    .setLabel("Duration")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 3 days")
    .setRequired(true);

  const winners = new TextInputBuilder()
    .setCustomId("winners")
    .setLabel("Number of Winners")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 1")
    .setRequired(true);

  return new ModalBuilder()
    .setTitle("🐰 Giveaway Request")
    .addComponents(
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(targetGroup),
      new ActionRowBuilder().addComponents(duration),
      new ActionRowBuilder().addComponents(winners)
    );
}

function extractGiveawayAnswers(fields) {
  return {
    description: fields.getTextInputValue("description"),
    targetGroup: fields.getTextInputValue("target_group"),
    duration: fields.getTextInputValue("duration"),
    winners: fields.getTextInputValue("winners"),
  };
}

function buildGiveawayEmbed(host, answers) {
  return new EmbedBuilder()
    .setTitle("🎁 New Giveaway Request! 🐰")
    .setColor(BRAND_COLOR)
    .setThumbnail(host.displayAvatarURL())
    .addFields(
      { name: "🎀 Description", value: answers.description },
      { name: "🌍 Target Group", value: answers.targetGroup, inline: true },
      { name: "⏳ Duration", value: answers.duration, inline: true },
      { name: "🏆 Winners", value: answers.winners, inline: true }
    )
    .setFooter({ text: "A moderator will review this shortly! 🐾" })
    .setTimestamp();
}

const MODAL_BUILDERS = {
  application: buildApplicationModal,
  giveaway: buildGiveawayModal,
};

const ANSWER_EXTRACTORS = {
  application: extractApplicationAnswers,
  giveaway: extractGiveawayAnswers,
};

const EMBED_BUILDERS = {
  application: buildApplicationEmbed,
  giveaway: buildGiveawayEmbed,
};

function roleIdsFor(guildConfig, settingKeys) {
  return settingKeys.map((key) => guildConfig[key]).filter(Boolean);
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "panel") {
    const guildConfig = getGuildConfig(interaction.guildId);
    const panelChannel = guildConfig["tickets-panel"]
      ? interaction.guild.channels.cache.get(guildConfig["tickets-panel"])
      : null;

    if (!panelChannel) {
      await interaction.reply({
        content: "The Tickets Panel channel isn't configured yet. Use /config to bind it first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await panelChannel.send(buildPanel());
    await interaction.reply({ content: `Panel posted in ${panelChannel}.`, flags: MessageFlags.Ephemeral });
  }
}

async function handleCreate(interaction, typeKey, answers) {
  const ticketType = TICKET_TYPES[typeKey];
  const guildConfig = getGuildConfig(interaction.guildId);
  const category = guildConfig["tickets-category"]
    ? interaction.guild.channels.cache.get(guildConfig["tickets-category"])
    : null;

  if (!category) {
    await interaction.reply({
      content: "The Tickets Category isn't configured yet. Ask an admin to set it up with /config.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const staffRoleIds = roleIdsFor(guildConfig, ticketType.staffRoleSettings);
  const pingRoleIds = roleIdsFor(guildConfig, ticketType.pingRoleSettings);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const permissionOverwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    ...staffRoleIds.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    })),
  ];

  const number = nextTicketNumber(interaction.guildId, ticketType.channelPrefix);
  const channelName = `${ticketType.channelPrefix}-${String(number).padStart(6, "0")}`;

  const ticketChannel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });

  createTicket(ticketChannel.id, {
    guildId: interaction.guildId,
    type: typeKey,
    creatorId: interaction.user.id,
    createdAt: Date.now(),
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
  );

  const pingContent = pingRoleIds.map((id) => `<@&${id}>`).join(" ");
  const intro = `${pingContent} — new **${ticketType.label}** ${answers ? "" : "ticket "}from ${interaction.user}.`;

  await ticketChannel.send({
    content: intro,
    embeds: answers ? [EMBED_BUILDERS[typeKey](interaction.user, answers)] : [],
    allowedMentions: { roles: pingRoleIds },
    components: [closeRow],
  });

  await interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });
}

async function canClose(interaction, ticket) {
  if (interaction.user.id === ticket.creatorId) return true;
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const ticketType = TICKET_TYPES[ticket.type];
  const guildConfig = getGuildConfig(interaction.guildId);
  const staffRoleIds = roleIdsFor(guildConfig, ticketType.staffRoleSettings);

  return staffRoleIds.some((roleId) => interaction.member.roles.cache.has(roleId));
}

async function buildTranscript(channel) {
  const lines = [];
  let before;

  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (batch.size === 0) break;

    for (const message of batch.values()) {
      lines.push(`[${new Date(message.createdTimestamp).toISOString()}] ${message.author.tag}: ${message.content}`);
    }

    before = batch.last().id;
    if (batch.size < 100) break;
  }

  return lines.reverse().join("\n");
}

async function handleClose(interaction) {
  const ticket = getTicket(interaction.channelId);

  if (!ticket) {
    await interaction.reply({ content: "This channel isn't a tracked ticket.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!(await canClose(interaction, ticket))) {
    await interaction.reply({ content: "You don't have permission to close this ticket.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({ content: "Closing ticket and saving transcript..." });

  const guildConfig = getGuildConfig(interaction.guildId);
  const ticketType = TICKET_TYPES[ticket.type];
  const logChannelId = guildConfig[ticketType.logSetting];
  const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;
  const transcript = await buildTranscript(interaction.channel);

  if (logChannel) {
    const creator = await interaction.client.users.fetch(ticket.creatorId).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`Ticket closed: ${interaction.channel.name}`)
      .addFields(
        { name: "Creator", value: creator ? creator.tag : ticket.creatorId, inline: true },
        { name: "Closed by", value: interaction.user.tag, inline: true },
        { name: "Type", value: ticketType.label, inline: true }
      )
      .setColor(BRAND_COLOR)
      .setTimestamp();

    const attachment = new AttachmentBuilder(Buffer.from(transcript || "(no messages)", "utf8"), {
      name: `${interaction.channel.name}.txt`,
    });

    await logChannel.send({ embeds: [embed], files: [attachment] });
  }

  deleteTicket(interaction.channelId);
  await interaction.channel.delete().catch(() => null);
}

export async function handleButton(interaction) {
  const [, action, typeKey] = interaction.customId.split(":");

  if (action === "create") {
    const ticketType = TICKET_TYPES[typeKey];

    if (ticketType.usesModal) {
      const modal = MODAL_BUILDERS[typeKey]().setCustomId(`ticket:modal:${typeKey}`);
      await interaction.showModal(modal);
      return;
    }

    await handleCreate(interaction, typeKey);
    return;
  }

  if (action === "close") {
    await handleClose(interaction);
  }
}

export async function handleModalSubmit(interaction) {
  const [, action, typeKey] = interaction.customId.split(":");
  if (action !== "modal") return;

  const answers = ANSWER_EXTRACTORS[typeKey](interaction.fields);
  await handleCreate(interaction, typeKey, answers);
}
