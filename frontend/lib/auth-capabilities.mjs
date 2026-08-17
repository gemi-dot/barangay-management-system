/**
 * Exact-match BIMS capability evaluation. The backend remains authoritative;
 * this helper only controls frontend visibility and enabled state.
 * @param {{is_authenticated?: boolean, capabilities?: string[]} | null | undefined} session
 * @param {string} capability
 */
export function sessionCan(session, capability) {
  if (!session?.is_authenticated || !capability) return false;
  return Array.isArray(session.capabilities) && session.capabilities.includes(capability);
}

/** @param {{is_authenticated?: boolean, capabilities?: string[]} | null | undefined} session */
export function hasOperationalCapability(session) {
  return Boolean(
    session?.is_authenticated &&
    Array.isArray(session.capabilities) &&
    session.capabilities.length > 0,
  );
}
