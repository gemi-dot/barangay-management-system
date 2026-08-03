export const RESIDENT_PROFILE_TAB_IDS = [
  "overview",
  "personal",
  "household",
  "family",
  "documents",
  "history",
  "qr",
];

/**
 * @param {string | undefined} requestedTab
 * @param {string[]} visibleTabs
 */
export function resolveResidentProfileTab(requestedTab, visibleTabs) {
  return requestedTab && visibleTabs.includes(requestedTab) ? requestedTab : "overview";
}
