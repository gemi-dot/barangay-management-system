/**
 * @param {"idle" | "loading" | "resolved" | "failed"} resolution
 * @param {object | null} resident
 */
export function portalIdentityControls(resolution, resident) {
  const resolved = resolution === "resolved";
  return {
    showRequestForm: resolved,
    showLinkedIdentity: resolved && resident !== null,
    showManualIdentity: resolved && resident === null,
  };
}
