/**
 * @param {string} apiBaseUrl
 * @param {string} variableName
 */
export function normalizeApiBaseUrl(apiBaseUrl, variableName) {
  const trimmedBaseUrl = apiBaseUrl.trim();
  if (!trimmedBaseUrl) {
    throw new Error(`${variableName} is not configured.`);
  }

  const normalizedBase = trimmedBaseUrl.replace(/\/+$/, "");
  return /\/api$/i.test(normalizedBase) ? normalizedBase : `${normalizedBase}/api`;
}

/** @param {string} apiBaseUrl */
export function portalRequestCreateUrl(apiBaseUrl) {
  return `${normalizeApiBaseUrl(apiBaseUrl, "NEXT_PUBLIC_API_BASE_URL")}/portal/requests/create/`;
}
