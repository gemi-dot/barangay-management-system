const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
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
  const response = await fetch(`${API_BASE_URL}/residents/`, {
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
  const response = await fetch(`${API_BASE_URL}/residents/${id}/detail/`, {
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

  const url = `${API_BASE_URL}/residents/${params.size ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Residents API failed: ${res.status}`);
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
  const res = await fetch(`${API_BASE_URL}/dashboard/summary/`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Dashboard summary API failed: ${res.status}`);
  }
  return res.json();
}
