import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { TIMER_TYPES } from "../config/timerTypes.js";
import { parseTimeWithOffset, nextOccurrenceUnix } from "../utils/derbyTime.js";
import { setScheduled } from "../utils/timerStore.js";

const choices = Object.entries(TIMER_TYPES).map(([value, type]) => ({ name: type.label, value }));

export const data = new SlashCommandBuilder()
  .setName("timers")
  .setDescription("Schedule a one-time broadcast timer")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName("selection").setDescription("Which timer to schedule").setRequired(true).addChoices(...choices)
  )
  .addStringOption((opt) =>
    opt
      .setName("time")
      .setDescription("24-hour format with UTC offset, e.g. 14:00 UTC+2 — plain 14:00 won't work")
      .setRequired(true)
  );

export async function execute(interaction) {
  const timerType = interaction.options.getString("selection", true);
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
  setScheduled(interaction.guildId, timerType, scheduledAt);

  await interaction.reply({
    content: `**${TIMER_TYPES[timerType].label}** scheduled for <t:${scheduledAt}:F> (<t:${scheduledAt}:R>).`,
    flags: MessageFlags.Ephemeral,
  });
}
