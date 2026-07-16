function getApiBaseUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return apiBaseUrl;
}

function getBackendBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, "");
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
  await fetch(`${getBackendBaseUrl()}/accounts/api/session/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
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
  member_count: number;
  house_ownership: string;
  total_monthly_income: string | null;
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
  system: {
    is_active: boolean;
    date_registered: string;
    created_at: string;
    updated_at: string;
    qr_code: string;
  };
};

export async function getResidents(): Promise<ResidentListItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/residents/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load residents: ${response.status}`);
  }

  const data = await response.json();

  // Supports either a plain list or DRF pagination.
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getResidentDetail(
  id: string | number,
): Promise<ResidentDetailResponse | null> {
  const response = await fetch(`${getApiBaseUrl()}/residents/${id}/detail/`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load resident detail: ${response.status}`);
  }

  return response.json();
}

export async function getResidentsPaginated(
  query: ResidentsQuery = {},
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
  const res = await fetchWithTimeout(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Residents API failed: ${res.status}`);
  }

  return res.json();
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

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Create resident failed: ${res.status} ${errBody}`);
  }

  return res.json();
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

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Update resident failed: ${res.status} ${errBody}`);
  }

  return res.json();
}

export async function setResidentActive(
  id: number | string,
  isActive: boolean,
): Promise<ResidentListItem> {
  return updateResident(id, { is_active: isActive });
}

export async function getResidentById(id: number | string): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${id}/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Resident lookup failed: ${res.status}`);
  }

  return res.json();
}

export async function getSessionInfo(): Promise<SessionInfo> {
  const res = await fetchWithTimeout(`${getBackendBaseUrl()}/accounts/api/session/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Session API failed: ${res.status}`);
  }

  return res.json();
}

export async function getOfficeProfile(): Promise<OfficeProfile> {
  const res = await fetch(`${getApiBaseUrl()}/office-profile/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Office profile failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Office profile update failed: ${res.status} ${body}`);
  }

  return res.json();
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
  const res = await fetch(`${getBackendBaseUrl()}/api/inventory/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Inventory summary failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/inventory/assets/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Inventory assets failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Assistant API failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/portal/register/`, {
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
    throw new Error(`Portal registration failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getPortalDashboard(): Promise<PortalDashboard> {
  const res = await fetch(`${getBackendBaseUrl()}/api/portal/dashboard/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Portal dashboard failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getPortalRequests(): Promise<{ results: PortalRequest[] }> {
  const res = await fetch(`${getBackendBaseUrl()}/api/portal/requests/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Portal requests failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/portal/requests/create/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Portal request create failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getBhwSummary(): Promise<BhwSummary> {
  const res = await fetch(`${getBackendBaseUrl()}/api/bhw-reports/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BHW summary failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/bhw-reports/senior-citizens/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BHW senior citizens failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<PaginatedResponse<BhwSeniorCitizen>>;
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

  const res = await fetch(`${getBackendBaseUrl()}/api/bhw-reports/fourps/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BHW 4Ps failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<PaginatedResponse<BhwFourPs>>;
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

  const res = await fetch(`${getBackendBaseUrl()}/api/bhw-reports/pregnancy/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BHW pregnancy failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<PaginatedResponse<BhwPregnancy>>;
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

  const res = await fetch(`${getBackendBaseUrl()}/api/bhw-reports/health/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BHW health failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<PaginatedResponse<BhwHealth>>;
}

export async function getHouseholdSummary(): Promise<HouseholdSummary> {
  const res = await fetch(`${getBackendBaseUrl()}/api/households/summary/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Household summary failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getHouseholds(query: {
  page?: number;
  page_size?: number;
  q?: string;
  zone?: string;
}): Promise<PaginatedResponse<HouseholdListItem>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  if (query.q) params.set("q", query.q);
  if (query.zone) params.set("zone", query.zone);

  const res = await fetch(`${getBackendBaseUrl()}/api/households/list/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Household list failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getTodayVisitorsReport(): Promise<TodayVisitorsReport> {
  const res = await fetch(`${getBackendBaseUrl()}/api/reports/today-visitors/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Today visitors report failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/reports/senior-citizens/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Senior citizens report failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/reports/businesses/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Businesses report failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/reports/fourps/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`4Ps report failed: ${res.status} ${body}`);
  }

  return res.json();
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

  const res = await fetch(`${getBackendBaseUrl()}/api/reports/pregnancy/?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pregnancy report failed: ${res.status} ${body}`);
  }

  return res.json();
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
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Dashboard summary API failed: ${res.status}`);
  }
  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Document requests API failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Update request status failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function trackDocumentRequest(
  trackingNumber: string,
): Promise<DocumentRequestTracking> {
  const params = new URLSearchParams({ tracking_number: trackingNumber.trim() });
  const res = await fetch(`${getApiBaseUrl()}/document-requests/track/?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Track request failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QR resolve failed: ${res.status} ${body}`);
  }

  return res.json();
}

export async function getResidentQuickView(
  residentId: number | string,
): Promise<ResidentQuickViewPayload> {
  const res = await fetch(`${getApiBaseUrl()}/residents/${residentId}/quick-view/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick view load failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Visit log failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick document request failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick gender correction load failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick gender correction save failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick birthday correction load failed: ${res.status} ${body}`);
  }

  return res.json();
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

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quick birthday correction save failed: ${res.status} ${body}`);
  }

  return res.json();
}
