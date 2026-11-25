export const accountRoles = {
  driver: { label: "Driver", login: "/driver/login", dashboard: "/driver/dashboard", credential: "Mobile number and password" },
  company: { label: "Company", login: "/company/login", dashboard: "/company/dashboard", credential: "Work email and password" },
  admin: { label: "Administrator", login: "/admin/login", dashboard: "/admin/dashboard", credential: "Authorized accounts only" },
} as const;

export type AccountRole = keyof typeof accountRoles;
