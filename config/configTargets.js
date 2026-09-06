import { ChannelType } from "discord.js";

export const CONFIG_TARGETS = {
  "tickets-panel": {
    label: "Tickets Panel",
    valueType: "channel",
    channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    actions: ["bind", "unbind"],
  },
  "tickets-category": {
    label: "Tickets Category",
    valueType: "channel",
    channelTypes: [ChannelType.GuildCategory],
    actions: ["bind", "unbind"],
  },
  "supporter-role": {
    label: "Supporter Role",
    valueType: "role",
    actions: ["bind", "unbind"],
  },
};
