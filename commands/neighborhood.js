import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from "discord.js";
import {
  listNeighborhoods,
  getNeighborhood,
  createNeighborhood,
  updateNeighborhood,
  deleteNeighborhood,
} from "../utils/neighborhoodStore.js";
import { postDerbyBoard } from "../utils/derbyBoard.js";
import { getBoard, deleteBoard } from "../utils/derbyBoardStore.js";
import { parseTimeWithOffset, nextOccurrenceUnix } from "../utils/derbyTime.js";
import { setScheduled } from "../utils/derbyAnnouncementStore.js";

export const data = new SlashCommandBuilder()
  .setName("neighborhood")
  .setDescription("Manage Hay Day neighborhoods")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Register a new neighborhood")
      .addStringOption((opt) => opt.setName("name").setDescription("Neighborhood name").setRequired(true))
      .addStringOption((opt) => opt.setName("tag").setDescription("Neighborhood tag, e.g. #ABC123XYZ"))
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Category for this neighborhood's channels")
          .addChannelTypes(ChannelType.GuildCategory)
      )
      .addChannelOption((opt) =>
        opt
          .setName("derby_channel")
          .setDescription("Channel for this neighborhood's derby board (must be inside the category)")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("edit")
      .setDescription("Edit an existing neighborhood")
      .addStringOption((opt) =>
        opt.setName("neighborhood").setDescription("Which neighborhood").setRequired(true).setAutocomplete(true)
      )
      .addStringOption((opt) => opt.setName("name").setDescription("New name"))
      .addStringOption((opt) => opt.setName("tag").setDescription("New tag"))
      .addChannelOption((opt) =>
        opt.setName("category").setDescription("New category").addChannelTypes(ChannelType.GuildCategory)
      )
      .addChannelOption((opt) =>
        opt
          .setName("derby_channel")
          .setDescription("New derby channel (must be inside the category)")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete a neighborhood")
      .addStringOption((opt) =>
        opt.setName("neighborhood").setDescription("Which neighborhood").setRequired(true).setAutocomplete(true)
      )
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("List all registered neighborhoods"))
  .addSubcommand((sub) =>
    sub
      .setName("derby-announcement")
      .setDescription("Schedule the derby delay announcement to every neighborhood's derby channel")
      .addStringOption((opt) =>
        opt
          .setName("time")
          .setDescription("24-hour format with UTC offset, e.g. 14:00 UTC+2 — plain 14:00 won't work")
          .setRequired(true)
      )
  );

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const matches = listNeighborhoods(interaction.guildId)
    .filter((n) => n.name.toLowerCase().includes(focused))
    .slice(0, 25)
    .map((n) => ({ name: n.name, value: n.id }));

  await interaction.respond(matches);
}

function formatNeighborhood(guild, n) {
  const category = n.categoryId ? guild.channels.cache.get(n.categoryId) : null;
  const derbyChannel = n.derbyChannelId ? guild.channels.cache.get(n.derbyChannelId) : null;
  return [
    `**${n.name}**${n.tag ? ` (${n.tag})` : ""}`,
    `Category: ${category ? category.name : "*not set*"}`,
    `Derby channel: ${derbyChannel ? derbyChannel.toString() : "*not set*"}`,
  ].join("\n");
}

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "list") {
    const neighborhoods = listNeighborhoods(interaction.guildId);
    if (neighborhoods.length === 0) {
      await interaction.reply({ content: "No neighborhoods registered yet.", flags: MessageFlags.Ephemeral });
      return;
    }
    const content = neighborhoods.map((n) => formatNeighborhood(interaction.guild, n)).join("\n\n");
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    return;
  }

  if (subcommand === "create") {
    const name = interaction.options.getString("name", true);
    const tag = interaction.options.getString("tag");
    const category = interaction.options.getChannel("category");
    const derbyChannel = interaction.options.getChannel("derby_channel");

    if (derbyChannel) {
      if (!category) {
        await interaction.reply({
          content: "A derby channel needs a category set at the same time — please also pick `category`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (derbyChannel.parentId !== category.id) {
        await interaction.reply({
          content: `${derbyChannel} must be inside ${category} to be its derby channel.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // posting the derby board (6 images, up to 20 reactions each) is slow — defer before doing it
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const record = createNeighborhood(interaction.guildId, {
      name,
      tag,
      categoryId: category?.id,
      derbyChannelId: derbyChannel?.id,
    });

    if (derbyChannel) {
      await postDerbyBoard(derbyChannel, interaction.guildId, record.id);
    }

    await interaction.editReply({
      content: `Neighborhood **${record.name}** created.${derbyChannel ? ` Derby board posted in ${derbyChannel}.` : ""}`,
    });
    return;
  }

  if (subcommand === "edit") {
    const id = interaction.options.getString("neighborhood", true);
    const existing = getNeighborhood(interaction.guildId, id);

    if (!existing) {
      await interaction.reply({ content: "That neighborhood no longer exists.", flags: MessageFlags.Ephemeral });
      return;
    }

    const name = interaction.options.getString("name");
    const tag = interaction.options.getString("tag");
    const category = interaction.options.getChannel("category");
    const derbyChannel = interaction.options.getChannel("derby_channel");

    const resolvedCategoryId = category?.id ?? existing.categoryId;
    const resolvedDerbyChannel =
      derbyChannel ?? (existing.derbyChannelId ? interaction.guild.channels.cache.get(existing.derbyChannelId) : null);

    if (resolvedDerbyChannel) {
      if (!resolvedCategoryId) {
        await interaction.reply({
          content: "A derby channel needs a category — please also pick `category`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (resolvedDerbyChannel.parentId !== resolvedCategoryId) {
        await interaction.reply({
          content: `${resolvedDerbyChannel} must be inside <#${resolvedCategoryId}> — please update \`derby_channel\` too if you're changing the category.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const patch = {};
    if (name) patch.name = name;
    if (tag) patch.tag = tag;
    if (category) patch.categoryId = category.id;
    if (derbyChannel) patch.derbyChannelId = derbyChannel.id;

    const updated = updateNeighborhood(interaction.guildId, id, patch);

    if (derbyChannel) {
      await postDerbyBoard(derbyChannel, interaction.guildId, id);
    }

    await interaction.editReply({
      content: `Neighborhood **${updated.name}** updated.${derbyChannel ? ` Derby board posted in ${derbyChannel}.` : ""}`,
    });
    return;
  }

  if (subcommand === "delete") {
    const id = interaction.options.getString("neighborhood", true);
    const existing = getNeighborhood(interaction.guildId, id);

    if (!existing) {
      await interaction.reply({ content: "That neighborhood no longer exists.", flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const board = getBoard(interaction.guildId, id);
    if (board && existing.derbyChannelId) {
      const channel = await interaction.guild.channels.fetch(existing.derbyChannelId).catch(() => null);
      if (channel) {
        for (const img of board) {
          const msg = await channel.messages.fetch(img.messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      }
      deleteBoard(interaction.guildId, id);
    }

    deleteNeighborhood(interaction.guildId, id);
    await interaction.editReply({ content: `Neighborhood **${existing.name}** deleted.` });
    return;
  }

  if (subcommand === "derby-announcement") {
    const timeInput = interaction.options.getString("time", true);
    const parsed = parseTimeWithOffset(timeInput);

    if (!parsed) {
      await interaction.reply({
        content:
          "Couldn't parse that time. Use 24-hour format with a UTC offset, e.g. `14:00 UTC+2` or `09:30 UTC-5`. Plain `14:00` without an offset won't work.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const scheduledAt = nextOccurrenceUnix(parsed);
    setScheduled(interaction.guildId, scheduledAt);

    await interaction.reply({
      content: `Derby announcement scheduled for <t:${scheduledAt}:F> (<t:${scheduledAt}:R>).`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
