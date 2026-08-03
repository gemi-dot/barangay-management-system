import { normalizeApiBaseUrl, portalRequestCreateUrl } from "./api-url.mjs";

function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return normalizeApiBaseUrl(apiBaseUrl, "NEXT_PUBLIC_API_BASE_URL");
}

function getBackendBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api$/, "");
}

function summarizePayload(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

function looksLikeHtml(contentType: string, payload: string) {
  const lowerContentType = contentType.toLowerCase();
  const trimmedPayload = payload.trim().toLowerCase();
  return (
    lowerContentType.includes("text/html") ||
    trimmedPayload.startsWith("<!doctype html") ||
    trimmedPayload.startsWith("<html")
  );
}

async function parseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = await response.text();
  const endpoint = response.url || "unknown endpoint";
  const isHtml = looksLikeHtml(contentType, payload);

  if (!response.ok) {
    if (isHtml) {
      console.error(`${context} received HTML from ${endpoint}`, {
        status: response.status,
        contentType,
        responsePreview: summarizePayload(payload),
      });
      throw new Error(
        `${context} failed: ${response.status} at ${endpoint} (received HTML; check the API endpoint and NEXT_PUBLIC_API_BASE_URL).`,
      );
    }

    let details = summarizePayload(payload);
    try {
      const parsed = JSON.parse(payload) as { detail?: string; errors?: unknown };
      details = parsed.detail || (parsed.errors ? JSON.stringify(parsed.errors) : details);
    } catch {
      // Keep the compact plain-text response as a fallback diagnostic.
    }
    throw new Error(
      `${context} failed: ${response.status} at ${endpoint}${details ? `: ${details}` : ""}`,
    );
  }

  if (isHtml) {
    console.error(`${context} expected JSON but received HTML from ${endpoint}`, {
      status: response.status,
      contentType,
      responsePreview: summarizePayload(payload),
    });
    throw new Error(
      `${context} returned HTML instead of JSON from ${endpoint}. Check the API endpoint and NEXT_PUBLIC_API_BASE_URL.`,
    );
  }

  if (!payload.trim()) {
    throw new Error(`${context} returned an empty response body.`);
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON. ${summarizePayload(payload)}`);
  }
}

const REQUEST_TIMEOUT_MS = 12000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Check that backend API is running.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!match) {
    return "";
  }
  return decodeURIComponent(match.slice(name.length + 1));
}

async function ensureCsrfCookie() {
  const response = await fetch(`${getBackendBaseUrl()}/accounts/api/session/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize CSRF cookie: ${response.status}`);
  }
}

export type ResidentListItem = {
  id: number;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  purok?: string;
  zone?: string;
  precinct_number?: string;
  is_active?: boolean;
  gender?: "M" | "F";
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ResidentsQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  zone?: string;
  gender?: "M" | "F";
  is_active?: boolean;
  ordering?: "last_name" | "-last_name" | "first_name" | "-first_name";
  fields?: Array<keyof ResidentListItem>;
};

export type ResidentUpsertPayload = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  date_of_birth: string;
  gender: "M" | "F";
  zone: string;
  precinct_number?: string;
  contact_number?: string;
  email?: string;
  civil_status?: string;
  citizenship?: string;
  is_active?: boolean;
};

export type SessionInfo = {
  is_authenticated: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  has_office_role?: boolean;
  office_roles?: string[];
  username: string;
  full_name: string;
};

export type OfficeProfile = {
  office_name: string;
  barangay: string;
  city_municipality: string;
  province: string;
  captain_name: string;
  default_or_number: string;
  default_control_number: string;
  updated_at: string;
};

export type ReportsDataset = {
  totalVoters: number;
  byPrecinct: Array<{ precinct: string; total: number }>;
  byPurok: Array<{ purok: string; total: number }>;
  voters: ResidentListItem[];
};

export type InventorySummary = {
  total_assets: number;
  active_assets: number;
  under_repair_assets: number;
  lost_assets: number;
  disposed_assets: number;
  top_categories: Array<{ category__name: string; total: number }>;
  top_locations: Array<{ location: string; total: number }>;
};

export type InventoryAsset = {
  id: number;
  property_number: string;
  description: string;
  category: string;
  status: string;
  condition: string;
  location: string;
  date_acquired: string | null;
};

export type InventoryCategoryOption = {
  value: string;
  label: string;
};

export type CreateInventoryAssetEntryPayload = {
  property_number?: string;
  category: string;
  description: string;
  serial_number?: string;
  brand_model?: string;
  date_acquired?: string;
  cost?: string;
  funding_source?: string;
  supplier?: string;
  useful_life_years?: string;
  condition?: string;
  location?: string;
  responsible_role?: string;
  accountability_status?: string;
  next_inspection_date?: string;
  status?: string;
  last_inventory_date?: string;
  notes?: string;
};

export type PortalDashboard = {
  user: {
    username: string;
    full_name: string;
    email: string;
  };
  resident: {
    id: number;
    full_name: string;
    zone: string;
    contact_number: string;
  } | null;
  counts: {
    total_requests: number;
    pending_requests: number;
    ready_requests: number;
  };
};

export type PortalRequest = {
  tracking_number: string;
  full_name: string;
  document_type: string;
  status: string;
  created_at: string;
};

export type StaffDocumentRequest = {
  id: number;
  tracking_number: string;
  full_name: string;
  contact_number: string;
  email: string;
  address: string;
  document_type: string;
  document_type_display: string;
  purpose: string;
  preferred_release_date: string | null;
  status: string;
  status_display: string;
  remarks: string;
  created_at: string;
  updated_at: string;
  processed_by: string;
};

export type DocumentRequestTracking = {
  tracking_number: string;
  full_name: string;
  document_type: string;
  document_type_display: string;
  status: string;
  status_display: string;
  remarks: string;
  created_at: string;
  updated_at: string;
};

export type QrResolveResponse = {
  status: "ok" | "invalid" | "not_found";
  raw_value: string;
  normalized_code: string;
  reason?: "invalid" | "not_found";
  resident_id?: number;
};

export type ResidentQuickViewPayload = {
  resident: {
    id: number;
    full_name: string;
    age: number;
    gender: "M" | "F";
    contact_number: string;
    civil_status: string;
    voters_id: string;
    precinct_number: string;
    qr_code: string;
    complete_address: string;
    emergency_contact_name: string;
    emergency_contact_number: string;
    emergency_contact_relationship: string;
    is_senior_citizen: boolean;
    is_4ps_beneficiary: boolean;
    is_pwd: boolean;
    is_solo_parent: boolean;
    is_active: boolean;
  };
  recent_logs: Array<{
    id: number;
    action: string;
    action_display: string;
    notes: string;
    created_at: string;
    logged_by: string;
  }>;
};

export type QuickGenderResidentRow = {
  id: number;
  full_name: string;
  date_of_birth: string;
  gender: "M" | "F";
};

export type QuickGenderCorrectionData = {
  zone_filter: string;
  zone_options: string[];
  total_count: number;
  male_count: number;
  female_count: number;
  residents: QuickGenderResidentRow[];
};

export type QuickBirthdayResidentRow = {
  id: number;
  full_name: string;
  date_of_birth: string;
};

export type QuickBirthdayCorrectionData = {
  zone_filter: string;
  zone_options: string[];
  total_count: number;
  default_dob_count: number;
  residents: QuickBirthdayResidentRow[];
};

export type BhwSummary = {
  senior_citizens_total: number;
  fourps_total: number;
  pregnancy_ongoing_total: number;
  pregnancy_due_soon: number;
  health_reports_last_30_days: number;
  health_reports_total: number;
};

export type BhwSeniorCitizen = {
  id: number;
  resident_id: number;
  full_name: string;
  zone: string;
  mobility_status: string;
  pension_source: string;
  caregiver_name: string;
};

export type BhwFourPs = {
  id: number;
  beneficiary_id: number;
  full_name: string;
  zone: string;
  household_id: string;
  monthly_grant_amount: string;
  set_of_year: number;
};

export type BhwPregnancy = {
  id: number;
  resident_id: number;
  full_name: string;
  zone: string;
  expected_due_date: string;
  pregnancy_outcome: string;
  prenatal_visits: number;
};

export type BhwHealth = {
  id: number;
  resident_id: number;
  full_name: string;
  zone: string;
  report_type: string;
  report_date: string;
  healthcare_provider: string;
};

export type HouseholdSummary = {
  total_households: number;
  total_residents: number;
  by_zone: Array<{ zone: string; total: number }>;
};

export type HouseholdListItem = {
  id: number;
  household_number: string;
  head_resident_id: number | null;
  head_full_name: string;
  zone: string;
  purok: string;
  complete_address: string;
  status: HouseholdStatus;
  member_count: number;
  house_ownership: string;
  total_monthly_income: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseholdStatus = "active" | "inactive" | "transferred" | "archived";

export type HouseholdStatistics = {
  total_members: number;
  active_members: number;
  inactive_members: number;
  children_count: number;
  adult_count: number;
  senior_citizen_count: number;
  male_count: number;
  female_count: number;
  voter_count: number;
  pwd_count: number;
  four_ps_beneficiary_count: number;
};

export type HouseholdMember = {
  id: number;
  resident_id: number;
  resident_code: string;
  full_name: string;
  photo_url: string | null;
  sex: "M" | "F";
  birth_date: string;
  age: number;
  resident_status: "active" | "inactive";
  relationship_to_head: string;
  status: "active" | "inactive" | "transferred";
  joined_date: string;
  left_date: string | null;
  voter_status: boolean;
};

export type HouseholdDetail = {
  id: number;
  household_number: string;
  head_of_household: {
    resident_id: number;
    resident_code: string;
    full_name: string;
  };
  complete_address: string;
  purok: string;
  status: HouseholdStatus;
  notes: string;
  house_ownership: "owned" | "rented" | "shared" | "caretaker";
  total_monthly_income: string | null;
  created_at: string;
  updated_at: string;
  members: HouseholdMember[];
  eligible_new_heads: HouseholdMember[];
  statistics: HouseholdStatistics;
};

export type HouseholdWritePayload = {
  household_number?: string;
  household_head_id?: number;
  complete_address?: string;
  purok?: string;
  status?: HouseholdStatus;
  notes?: string;
  house_ownership?: "owned" | "rented" | "shared" | "caretaker";
  total_monthly_income?: string | null;
};

export type TodayVisitor = {
  resident_id: number;
  full_name: string;
  zone: string;
  precinct_number: string;
  logged_at: string;
  logged_by: string;
};

export type TodayVisitorsReport = {
  report_date: string;
  visitors_today_count: number;
  results: TodayVisitor[];
};

export type SeniorCitizensReport = {
  total_seniors: number;
  seniors_with_reports: number;
  seniors_needing_assessment: number;
  zones: string[];
  count: number;
  next: number | null;
  previous: number | null;
  results: BhwSeniorCitizen[];
};

export type BusinessReportItem = {
  id: number;
  business_name: string;
  business_type: string;
  owner_name: string;
  zone: string;
  has_proper_sanitation: boolean;
  has_fire_safety_measures: boolean;
};

export type BusinessesReport = {
  total_businesses: number;
  sari_sari_count: number;
  carenderia_count: number;
  both_count: number;
  sanitation_compliant: number;
  fire_safety_compliant: number;
  count: number;
  next: number | null;
  previous: number | null;
  results: BusinessReportItem[];
};

export type FourPsReport = {
  total_beneficiaries: number;
  education_compliant: number;
  health_compliant: number;
  fds_compliant: number;
  count: number;
  next: number | null;
  previous: number | null;
  results: Array<
    BhwFourPs & {
      education_compliance: boolean;
      health_compliance: boolean;
      family_development_sessions: boolean;
    }
  >;
};

export type PregnancyReportItem = {
  id: number;
  resident_id: number;
  full_name: string;
  zone: string;
  expected_due_date: string;
  age_of_gestation_weeks: number | null;
  high_risk_pregnancy: boolean;
  due_soon: boolean;
  number_of_prenatal_visits: number;
};

export type PregnancyReport = {
  total_pregnancies: number;
  high_risk_pregnancies: number;
  first_trimester_count: number;
  second_trimester_count: number;
  third_trimester_count: number;
  upcoming_deliveries_count: number;
  count: number;
  next: number | null;
  previous: number | null;
  results: PregnancyReportItem[];
};

export type ResidentDetailResponse = {
  identity: {
    id: number;
    full_name: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    age: number;
    gender: "M" | "F";
    date_of_birth: string;
    civil_status: string;
    citizenship: string;
  };
  contact: {
    contact_number: string;
    email: string;
  };
  address: {
    house_number: string | null;
    street: string | null;
    zone: string;
    barangay: string;
    city_municipality: string;
    province: string;
    zip_code: string;
  };
  voter: {
    precinct_number: string;
    voters_id: string;
  };
  socioeconomic: {
    employment_status: string | null;
    occupation: string;
    educational_attainment: string | null;
    is_4ps_beneficiary: boolean;
  };
  health: {
    blood_type: string;
    allergies: string;
    medical_conditions: string;
    is_pwd: boolean;
    pwd_type: string;
    is_senior_citizen: boolean;
    is_solo_parent: boolean;
    is_indigenous: boolean;
  };
  household: null | {
    id: number;
    household_number: string;
    head_resident_id: number;
    head_full_name: string;
    complete_address: string;
    purok: string;
    status: HouseholdStatus;
    relationship_to_head: string;
    members: Array<{
      resident_id: number;
      full_name: string;
      relationship_to_head: string;
      resident_status: "active" | "inactive";
    }>;
  };
  family: {
    father_name: string;
    mother_name: string;
    spouse_name: string;
    emergency_contact_name: string;
    emergency_contact_number: string;
    emergency_contact_relationship: string;
  };
  documents: Array<{
    id: number;
    tracking_number: string;
    document_type: string;
    document_type_display: string;
    purpose: string;
    status: string;
    status_display: string;
    created_at: string;
    updated_at: string;
  }>;
  history: Array<{
    id: number;
    action: string;
    action_display: string;
    notes: string;
    created_at: string;
    logged_by: string;
  }>;
  qr_profile: {
    code: string;
    image_url: string | null;
  };
  system: {
    is_active: boolean;
    date_registered: string;
    created_at: string;
    updated_at: string;
    qr_code: string;
  };
};

export type FamilyRelationshipType = "parent" | "child" | "spouse" | "sibling" | "guardian" | "ward";

export type FamilyResidentNode = {
  resident_id: number;
  full_name: string;
  gender: "M" | "F";
  age: number;
  is_active: boolean;
  relationship_id?: number;
  relationship_type?: FamilyRelationshipType;
};

export type FamilyRelationshipRecord = {
  id: number;
  pair_id: string;
  relationship_type: FamilyRelationshipType;
  relationship_display: string;
  resident: {
    id: number;
    full_name: string;
    gender: "M" | "F";
    age: number;
    is_active: boolean;
  };
  notes: string;
  created_by: string;
  created_at: string;
};

export type FamilyTree = {
  resident: FamilyResidentNode;
  parents: FamilyResidentNode[];
  guardians: FamilyResidentNode[];
  spouses: FamilyResidentNode[];
  siblings: FamilyResidentNode[];
  children: FamilyResidentNode[];
  wards: FamilyResidentNode[];
};

export async function getResidents(): Promise<ResidentListItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/residents/`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await parseJsonResponse<ResidentListItem[] | PaginatedResponse<ResidentListItem>>(
    response,
    "Failed to load residents",
  );

  // Supports either a plain list or DRF pagination.
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getResidentDetail(
  id: string | number,
  requestOptions: Pick<RequestInit, "headers"> & { apiBaseUrl: string },
): Promise<ResidentDetailResponse | null> {
  const apiBaseUrl = normalizeApiBaseUrl(
    requestOptions.apiBaseUrl,
    "INTERNAL_API_BASE_URL",
  );
  const response = await fetch(`${apiBaseUrl}/residents/${id}/detail/`, {
    headers: requestOptions.headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  return parseJsonResponse<ResidentDetailResponse>(response, "Failed to load resident detail");
}

export async function getFamilyRelationships(
  residentId: number | string,
): Promise<FamilyRelationshipRecord[]> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/family-relationships/`, {
    credentials: "include",
    cache: "no-store",
  });
  const payload = await parseJsonResponse<{ results: FamilyRelationshipRecord[] }>(res, "Family relationships");
  return payload.results;
}

export async function getFamilyTree(residentId: number | string): Promise<FamilyTree> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/family-tree/`, {
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<FamilyTree>(res, "Family tree");
}

export async function createFamilyRelationship(
  residentId: number | string,
  payload: { to_resident_id: number; relationship_type: FamilyRelationshipType; notes?: string },
): Promise<FamilyRelationshipRecord> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/family-relationships/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<FamilyRelationshipRecord>(res, "Create family relationship");
}

export async function removeFamilyRelationship(
  residentId: number | string,
  relationshipId: number | string,
): Promise<void> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/family-relationships/${relationshipId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Remove family relationship failed: ${res.status}${payload ? ` ${summarizePayload(payload)}` : ""}`);
  }
}

export async function getResidentsPaginated(
  query: ResidentsQuery = {},
  requestOptions: Pick<RequestInit, "credentials"> = { credentials: "include" },
): Promise<PaginatedResponse<ResidentListItem>> {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.search) params.set("search", query.search);
  if (query.zone) params.set("zone", query.zone);
  if (query.gender) params.set("gender", query.gender);
  if (typeof query.is_active === "boolean") {
    params.set("is_active", String(query.is_active));
  }
  if (query.ordering) params.set("ordering", query.ordering);
  if (query.fields?.length) params.set("fields", query.fields.join(","));
  if (!query.fields?.length) {
    params.set(
      "fields",
      [
        "id",
        "first_name",
        "middle_name",
        "last_name",
        "full_name",
        "zone",
        "gender",
        "precinct_number",
        "is_active",
      ].join(","),
    );
  }

  const url = `${getApiBaseUrl()}/residents/${params.size ? `?${params.toString()}` : ""}`;
  const res = await fetchWithTimeout(url, { ...requestOptions, cache: "no-store" });

  return parseJsonResponse<PaginatedResponse<ResidentListItem>>(res, "Residents API");
}

export async function getReportsDataset(): Promise<ReportsDataset> {
  const pageSize = 100;
  let page = 1;
  let count = 0;
  const voters: ResidentListItem[] = [];

  do {
    const chunk = await getResidentsPaginated({
      page,
      page_size: pageSize,
      is_active: true,
      ordering: "last_name",
      fields: [
        "id",
        "first_name",
        "middle_name",
        "last_name",
        "zone",
        "precinct_number",
        "is_active",
        "gender",
      ],
    });

    count = chunk.count;
    voters.push(...chunk.results);
    page += 1;
  } while (voters.length < count);

  const precinctMap = new Map<string, number>();
  const purokMap = new Map<string, number>();
  for (const voter of voters) {
    const precinct = (voter.precinct_number || "Unassigned").trim() || "Unassigned";
    const purok = (voter.zone || "Unassigned").trim() || "Unassigned";

    precinctMap.set(precinct, (precinctMap.get(precinct) || 0) + 1);
    purokMap.set(purok, (purokMap.get(purok) || 0) + 1);
  }

  const byPrecinct = [...precinctMap.entries()]
    .map(([precinct, total]) => ({ precinct, total }))
    .sort((a, b) => b.total - a.total || a.precinct.localeCompare(b.precinct));

  const byPurok = [...purokMap.entries()]
    .map(([purok, total]) => ({ purok, total }))
    .sort((a, b) => b.total - a.total || a.purok.localeCompare(b.purok));

  return {
    totalVoters: voters.length,
    byPrecinct,
    byPurok,
    voters,
  };
}

export async function createResident(
  payload: ResidentUpsertPayload,
): Promise<ResidentListItem> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}/residents/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<ResidentListItem>(res, "Create resident");
}

export async function updateResident(
  id: number | string,
  payload: Partial<ResidentUpsertPayload>,
): Promise<ResidentListItem> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}/residents/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<ResidentListItem>(res, "Update resident");
}

export async function setResidentActive(
  id: number | string,
  isActive: boolean,
): Promise<ResidentListItem> {
  return updateResident(id, { is_active: isActive });
}

export async function getResidentById(id: number | string): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${id}/`, {
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<Record<string, unknown>>(res, "Resident lookup");
}

export async function getSessionInfo(): Promise<SessionInfo> {
  const res = await fetchWithTimeout(`${getBackendBaseUrl()}/accounts/api/session/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<SessionInfo>(res, "Session API");
}

export async function getOfficeProfile(): Promise<OfficeProfile> {
  const res = await fetch(`${getApiBaseUrl()}/office-profile/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<OfficeProfile>(res, "Office profile");
}

export async function updateOfficeProfile(payload: Partial<OfficeProfile>): Promise<OfficeProfile> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/office-profile/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<OfficeProfile>(res, "Office profile update");
}

export async function loginWithSession(
  username: string,
  password: string,
): Promise<SessionInfo> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const body = new URLSearchParams({
    username,
    password,
  });

  const res = await fetch(`${getBackendBaseUrl()}/accounts/api/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrfToken,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Login failed: ${res.status} ${errBody}`);
  }

  return getSessionInfo();
}

export async function logoutSession(): Promise<void> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getBackendBaseUrl()}/accounts/api/logout/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": csrfToken,
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Logout failed: ${res.status} ${errBody}`);
  }
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const res = await fetch(`${getApiBaseUrl()}/inventory/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<InventorySummary>(res, "Inventory summary");
}

export async function getInventoryAssets(query: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
}): Promise<PaginatedResponse<InventoryAsset>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);

  const res = await fetch(`${getApiBaseUrl()}/inventory/assets/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<InventoryAsset>>(res, "Inventory assets");
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function getInventoryCategoryOptions(): Promise<InventoryCategoryOption[]> {
  const res = await fetch(`${getBackendBaseUrl()}/inventory/items/add/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Inventory form options failed: ${res.status} ${body}`);
  }

  const html = await res.text();
  const selectMatch = html.match(/<select[^>]*name=["']category["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!selectMatch) {
    throw new Error("Category options are not available from the backend form.");
  }

  const options: InventoryCategoryOption[] = [];
  const optionRegex = /<option[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi;
  let optionMatch: RegExpExecArray | null;
  while ((optionMatch = optionRegex.exec(selectMatch[1])) !== null) {
    const value = optionMatch[1].trim();
    const label = stripHtml(optionMatch[2]);
    if (value) {
      options.push({ value, label });
    }
  }

  return options;
}

export async function createInventoryAssetEntry(
  payload: CreateInventoryAssetEntryPayload,
): Promise<void> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const body = new URLSearchParams({
    property_number: payload.property_number || "",
    category: payload.category,
    description: payload.description,
    serial_number: payload.serial_number || "",
    brand_model: payload.brand_model || "",
    date_acquired: payload.date_acquired || "",
    cost: payload.cost || "",
    funding_source: payload.funding_source || "barangay_fund",
    supplier: payload.supplier || "",
    useful_life_years: payload.useful_life_years || "",
    condition: payload.condition || "good",
    location: payload.location || "barangay_hall",
    responsible_person: "",
    responsible_role: payload.responsible_role || "",
    accountability_status: payload.accountability_status || "",
    next_inspection_date: payload.next_inspection_date || "",
    status: payload.status || "active",
    last_inventory_date: payload.last_inventory_date || "",
    notes: payload.notes || "",
  });

  const res = await fetch(`${getBackendBaseUrl()}/inventory/items/add/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrfToken,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create asset failed: ${res.status} ${text}`);
  }

  const text = await res.text();
  if (/Please correct the errors|errorlist|This field is required/i.test(text)) {
    throw new Error("Asset entry was not saved. Please check required fields.");
  }
}

export async function askAssistant(message: string): Promise<{
  answer: string;
  matched_question: string | null;
  suggestions?: string[];
}> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getBackendBaseUrl()}/assistant/api/ask/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ message }),
  });

  return parseJsonResponse<{ answer: string; matched_question: string | null; suggestions?: string[] }>(
    res,
    "Assistant API",
  );
}

export async function portalRegister(payload: {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password1: string;
  password2: string;
}) {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const body = new URLSearchParams(payload);

  const res = await fetch(`${getApiBaseUrl()}/portal/register/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrfToken,
    },
    body: body.toString(),
  });

  return parseJsonResponse(res, "Portal registration");
}

export async function getPortalDashboard(): Promise<PortalDashboard> {
  const res = await fetch(`${getApiBaseUrl()}/portal/dashboard/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PortalDashboard>(res, "Portal dashboard");
}

export async function getPortalRequests(): Promise<{ results: PortalRequest[] }> {
  const res = await fetch(`${getApiBaseUrl()}/portal/requests/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<{ results: PortalRequest[] }>(res, "Portal requests");
}

export async function createPortalRequest(payload: {
  full_name: string;
  contact_number: string;
  email: string;
  address: string;
  document_type: string;
  purpose: string;
  preferred_release_date?: string;
}) {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(portalRequestCreateUrl(getApiBaseUrl()), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(res, "Portal request create");
}

export async function getBhwSummary(): Promise<BhwSummary> {
  const res = await fetch(`${getApiBaseUrl()}/bhw-reports/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<BhwSummary>(res, "BHW summary");
}

export async function getBhwSeniorCitizens(query: {
  page?: number;
  page_size?: number;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);

  const res = await fetch(`${getApiBaseUrl()}/bhw-reports/senior-citizens/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<BhwSeniorCitizen>>(res, "BHW senior citizens");
}

export async function getBhwFourPs(query: {
  page?: number;
  page_size?: number;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);

  const res = await fetch(`${getApiBaseUrl()}/bhw-reports/fourps/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<BhwFourPs>>(res, "BHW 4Ps");
}

export async function getBhwPregnancy(query: {
  page?: number;
  page_size?: number;
  q?: string;
  outcome?: string;
}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.outcome) params.set("outcome", query.outcome);

  const res = await fetch(`${getApiBaseUrl()}/bhw-reports/pregnancy/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<BhwPregnancy>>(res, "BHW pregnancy");
}

export async function getBhwHealth(query: {
  page?: number;
  page_size?: number;
  q?: string;
  report_type?: string;
}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.report_type) params.set("report_type", query.report_type);

  const res = await fetch(`${getApiBaseUrl()}/bhw-reports/health/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<BhwHealth>>(res, "BHW health");
}

export async function getHouseholdSummary(): Promise<HouseholdSummary> {
  const res = await fetch(`${getApiBaseUrl()}/households/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<HouseholdSummary>(res, "Household summary");
}

export async function getHouseholds(query: {
  page?: number;
  page_size?: number;
  q?: string;
  zone?: string;
  status?: HouseholdStatus | "";
}): Promise<PaginatedResponse<HouseholdListItem>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.zone) params.set("zone", query.zone);
  if (query.status) params.set("status", query.status);

  const res = await fetch(`${getApiBaseUrl()}/households/list/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<HouseholdListItem>>(res, "Household list");
}

export async function getHousehold(id: number | string): Promise<HouseholdDetail> {
  const res = await fetch(`${getApiBaseUrl()}/households/${id}/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<HouseholdDetail>(res, "Household detail");
}

async function householdJsonMutation<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  payload: unknown,
  context: string,
): Promise<T> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<T>(res, context);
}

export function createHousehold(payload: HouseholdWritePayload & { household_head_id: number }) {
  return householdJsonMutation<HouseholdDetail>(
    "/households/",
    "POST",
    payload,
    "Create household",
  );
}

export function updateHousehold(id: number | string, payload: HouseholdWritePayload) {
  return householdJsonMutation<HouseholdDetail>(
    `/households/${id}/`,
    "PATCH",
    payload,
    "Update household",
  );
}

export function setHouseholdArchived(
  id: number | string,
  status: "inactive" | "archived",
) {
  return householdJsonMutation<HouseholdDetail>(
    `/households/${id}/archive/`,
    "POST",
    { status },
    "Change household status",
  );
}

export function addHouseholdMember(
  id: number | string,
  payload: { resident_id: number; relationship_to_head: string; move?: boolean },
) {
  return householdJsonMutation<HouseholdMember>(
    `/households/${id}/members/`,
    "POST",
    payload,
    "Add household member",
  );
}

export async function removeHouseholdMember(
  id: number | string,
  residentId: number | string,
): Promise<void> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");
  const res = await fetch(`${getApiBaseUrl()}/households/${id}/members/${residentId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-CSRFToken": csrfToken },
  });
  if (!res.ok) {
    const payload = await res.text();
    throw new Error(`Remove household member failed: ${res.status}${payload ? ` ${summarizePayload(payload)}` : ""}`);
  }
}

export function changeHouseholdHead(
  id: number | string,
  payload: { resident_id: number; previous_head_relationship: string },
) {
  return householdJsonMutation<HouseholdDetail>(
    `/households/${id}/change-head/`,
    "POST",
    payload,
    "Change household head",
  );
}

export async function getTodayVisitorsReport(): Promise<TodayVisitorsReport> {
  const res = await fetch(`${getApiBaseUrl()}/reports/today-visitors/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<TodayVisitorsReport>(res, "Today visitors report");
}

export async function getSeniorCitizensReport(query: {
  page?: number;
  page_size?: number;
  q?: string;
  zone?: string;
}): Promise<SeniorCitizensReport> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.zone) params.set("zone", query.zone);

  const res = await fetch(`${getApiBaseUrl()}/reports/senior-citizens/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<SeniorCitizensReport>(res, "Senior citizens report");
}

export async function getBusinessesReport(query: {
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<BusinessesReport> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);

  const res = await fetch(`${getApiBaseUrl()}/reports/businesses/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<BusinessesReport>(res, "Businesses report");
}

export async function getFourPsReport(query: {
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<FourPsReport> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);

  const res = await fetch(`${getApiBaseUrl()}/reports/fourps/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<FourPsReport>(res, "4Ps report");
}

export async function getPregnancyReport(query: {
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<PregnancyReport> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);

  const res = await fetch(`${getApiBaseUrl()}/reports/pregnancy/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PregnancyReport>(res, "Pregnancy report");
}

export type DashboardSummary = {
  generated_at: string;
  cards: {
    total_residents: number;
    total_households: number;
    senior_citizens: number;
    fourps_beneficiaries: number;
    pwd_count: number;
    active_businesses: number;
    active_pregnancies: number;
    active_fourps_reports: number;
    recent_health_reports: number;
    ready_today_count: number;
    currently_ready_count: number;
    visitors_today_count: number;
    pending_document_requests: number;
  };
  charts: {
    gender_distribution: {
      male: number;
      female: number;
    };
    age_distribution: {
      children: number;
      adults: number;
      seniors: number;
    };
    zone_distribution: Array<{
      zone: string;
      count: number;
      percentage: number;
    }>;
  };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${getApiBaseUrl()}/dashboard/summary/`, {
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<DashboardSummary>(res, "Dashboard summary API");
}

export async function getStaffDocumentRequests(query: {
  page?: number;
  page_size?: number;
  status?: string;
}): Promise<PaginatedResponse<StaffDocumentRequest>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.status) params.set("status", query.status);

  const url = `${getApiBaseUrl()}/document-requests/${params.size ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<PaginatedResponse<StaffDocumentRequest>>(res, "Document requests API");
}

export async function updateStaffDocumentRequestStatus(
  id: number,
  status: string,
  remarks: string,
): Promise<StaffDocumentRequest> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/document-requests/${id}/status/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ status, remarks }),
  });

  return parseJsonResponse<StaffDocumentRequest>(res, "Update request status");
}

export async function trackDocumentRequest(
  trackingNumber: string,
): Promise<DocumentRequestTracking> {
  const params = new URLSearchParams({ tracking_number: trackingNumber.trim() });
  const res = await fetch(`${getApiBaseUrl()}/document-requests/track/?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<DocumentRequestTracking>(res, "Track request");
}

export async function resolveResidentQr(qrInput: string): Promise<QrResolveResponse> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/qr/resolve/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ qr_input: qrInput }),
  });

  return parseJsonResponse<QrResolveResponse>(res, "QR resolve");
}

export async function getResidentQuickView(
  residentId: number | string,
): Promise<ResidentQuickViewPayload> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/quick-view/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return parseJsonResponse<ResidentQuickViewPayload>(res, "Quick view load");
}

export async function logResidentVisitToday(
  residentId: number | string,
): Promise<{ detail: string }> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/service-log/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ action: "visited_today" }),
  });

  return parseJsonResponse<{ detail: string }>(res, "Visit log");
}

export async function createQuickResidentDocumentRequest(
  residentId: number | string,
  documentType: string,
): Promise<{
  detail: string;
  tracking_number: string;
  document_type_display: string;
}> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/quick-document-request/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ document_type: documentType }),
  });

  return parseJsonResponse<{
    detail: string;
    tracking_number: string;
    document_type_display: string;
  }>(res, "Quick document request");
}

export async function getQuickGenderCorrection(
  zone?: string,
): Promise<QuickGenderCorrectionData> {
  const params = new URLSearchParams();
  if (zone) params.set("zone", zone);

  const res = await fetch(
    `${getApiBaseUrl()}/quick-tools/gender-correction/${params.size ? `?${params.toString()}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  return parseJsonResponse<QuickGenderCorrectionData>(res, "Quick gender correction load");
}

export async function saveQuickGenderCorrection(
  zone: string,
  updates: Array<{ id: number; date_of_birth: string; gender: "M" | "F" }>,
): Promise<{ gender_updates: number; birthday_updates: number; invalid_birthday_rows: number }> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/quick-tools/gender-correction/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ zone, updates }),
  });

  return parseJsonResponse<{
    gender_updates: number;
    birthday_updates: number;
    invalid_birthday_rows: number;
  }>(res, "Quick gender correction save");
}

export async function getQuickBirthdayCorrection(
  zone?: string,
): Promise<QuickBirthdayCorrectionData> {
  const params = new URLSearchParams();
  if (zone) params.set("zone", zone);

  const res = await fetch(
    `${getApiBaseUrl()}/quick-tools/birthday-correction/${params.size ? `?${params.toString()}` : ""}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  return parseJsonResponse<QuickBirthdayCorrectionData>(res, "Quick birthday correction load");
}

export async function saveQuickBirthdayCorrection(
  zone: string,
  updates: Array<{ id: number; date_of_birth: string }>,
): Promise<{ birthday_updates: number; invalid_birthday_rows: number }> {
  await ensureCsrfCookie();
  const csrfToken = readCookie("csrftoken");

  const res = await fetch(`${getApiBaseUrl()}/quick-tools/birthday-correction/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({ zone, updates }),
  });

  return parseJsonResponse<{ birthday_updates: number; invalid_birthday_rows: number }>(
    res,
    "Quick birthday correction save",
  );
}
