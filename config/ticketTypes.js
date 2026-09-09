export const TICKET_TYPES = {
  "support-services": {
    label: "Support Services",
    channelPrefix: "ticket",
    staffRoleSettings: ["supporter-role", "moderator-role"],
    pingRoleSettings: ["supporter-role", "moderator-role"],
    logSetting: "ticket-log",
    autoMessageKey: "support-services",
  },
  application: {
    label: "Application",
    channelPrefix: "application",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
    usesModal: true,
    logSetting: "application-ticket-log",
    autoMessageKey: "application",
  },
  giveaway: {
    label: "Giveaway",
    channelPrefix: "giveaway",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
    usesModal: true,
    logSetting: "ticket-log",
  },
};
