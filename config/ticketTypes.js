export const TICKET_TYPES = {
  support: {
    label: "Support",
    channelPrefix: "ticket",
    staffRoleSettings: ["supporter-role", "moderator-role"],
    pingRoleSettings: ["supporter-role"],
  },
  report: {
    label: "Report",
    channelPrefix: "ticket",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
  },
  application: {
    label: "Application",
    channelPrefix: "application",
    staffRoleSettings: ["moderator-role"],
    pingRoleSettings: ["moderator-role"],
    usesModal: true,
  },
};
