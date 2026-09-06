export const TICKET_TYPES = {
  support: {
    label: "Support",
    channelPrefix: "ticket",
    staffRoleSettings: ["supporter-role", "moderator-role"],
    pingRoleSettings: ["supporter-role"],
    logSetting: "ticket-log",
  },
  report: {
    label: "Report",
    channelPrefix: "ticket",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
    logSetting: "ticket-log",
  },
  application: {
    label: "Application",
    channelPrefix: "application",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
    usesModal: true,
    logSetting: "application-ticket-log",
  },
};
