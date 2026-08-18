/**
 * Sidebar visibility guard.
 * Capability checks are authoritative when present; role checks are legacy fallback.
 * @param {{ capability?: string, roles?: string[] }} item
 * @param {string[]} userRoles
 * @param {(capability: string) => boolean} can
 */
export function hasNavigationAccess(item, userRoles, can) {
  if (item?.capability) {
    return can(item.capability);
  }

  if (!Array.isArray(item?.roles) || item.roles.length === 0) {
    return true;
  }

  return item.roles.some((role) => userRoles.includes(role));
}
