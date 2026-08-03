/**
 * The Change Head action is available only for a candidate returned by the API
 * and while no household membership request is running.
 *
 * @param {object | null | undefined} selectedHead
 * @param {boolean} busy
 */
export function canSubmitHeadChange(selectedHead, busy) {
  return Boolean(selectedHead) && !busy;
}
