import { ChannelType } from "discord.js";

export const CONFIG_TARGETS = {
  "tickets-panel": {
    label: "Tickets Panel",
    channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    actions: ["bind", "unbind"],
  },
  "tickets-category": {
    label: "Tickets Category",
    channelTypes: [ChannelType.GuildCategory],
    actions: ["bind", "unbind"],
  },
};
