/** @param {string[]} warnings @param {boolean} canManage @param {boolean} busy */
export function canSubmitResidentDocument(warnings, canManage, busy) {
  return canManage && !busy && warnings.length === 0;
}

/** @param {string[]} availableTransitions @param {string} transition */
export function canShowDocumentTransition(availableTransitions, transition) {
  return availableTransitions.includes(transition);
}

/** @param {string | undefined} status @param {string} reason */
export function qrActionAvailability(status, reason) {
  return {
    issue: !status,
    reissue: status === "active" && reason.trim().length > 0,
    revoke: status === "active" && reason.trim().length > 0,
  };
}
