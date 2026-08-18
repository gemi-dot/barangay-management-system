const DISPLAY_ROLES = ["Secretary", "BHW", "Captain"];

/** @param {{office_roles?: string[], roles?: string[], is_superuser?: boolean} | null | undefined} session */
export function operationalRole(session) {
  if (session?.is_superuser) return "Superuser";

  const roles = Array.isArray(session?.office_roles)
    ? session.office_roles
    : Array.isArray(session?.roles)
      ? session.roles
      : [];

  return DISPLAY_ROLES.find((role) => roles.includes(role)) ?? null;
}

/** @param {{office_roles?: string[], roles?: string[], is_superuser?: boolean} | null | undefined} session */
export function operationalAccessLabel(session) {
  const role = operationalRole(session);
  return role ? `${role} access` : "Authorized access";
}

/** @param {{office_roles?: string[], roles?: string[], is_superuser?: boolean} | null | undefined} session */
export function operationalIdentityLabel(session) {
  return operationalRole(session) ?? "authorized user";
}
