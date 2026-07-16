type ZoneDistribution = {
  zone: string;
  count: number;
  percentage: number;
};

type DashboardCommunityAnalyticsProps = {
  male: number;
  female: number;
  childrenCount: number;
  adults: number;
  seniors: number;
  zones: ZoneDistribution[];
  fourPsBeneficiaries: number;
  seniorCitizens: number;
};

function ratio(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function DashboardCommunityAnalytics({
  male,
  female,
  childrenCount,
  adults,
  seniors,
  zones,
  fourPsBeneficiaries,
  seniorCitizens,
}: DashboardCommunityAnalyticsProps) {
  const totalGender = male + female;
  const totalAge = childrenCount + adults + seniors;
  const zoneMax = Math.max(1, ...zones.map((zone) => zone.count));

  return (
    <section className="rounded-[1.35rem] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Community Analytics</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Population and service indicators</h2>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1rem] border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Gender distribution</h3>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-blue-600" style={{ width: `${ratio(male, totalGender)}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white px-2 py-1.5 text-slate-700">Male: {male}</div>
            <div className="rounded-lg bg-white px-2 py-1.5 text-slate-700">Female: {female}</div>
          </div>
        </article>

        <article className="rounded-[1rem] border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Age group distribution</h3>
          <div className="mt-3 space-y-2 text-xs">
            {[
              { label: "Children", value: childrenCount, tone: "bg-sky-500" },
              { label: "Adults", value: adults, tone: "bg-emerald-500" },
              { label: "Seniors", value: seniors, tone: "bg-amber-500" },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-slate-700">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200">
                  <div className={`h-2.5 rounded-full ${row.tone}`} style={{ width: `${ratio(row.value, totalAge)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1rem] border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Senior and 4Ps summary</h3>
          <div className="mt-3 grid gap-2 text-xs">
            <div className="rounded-lg bg-white px-3 py-2 text-slate-700">
              Senior citizens: <span className="font-semibold text-slate-900">{seniorCitizens}</span>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-slate-700">
              4Ps beneficiaries: <span className="font-semibold text-slate-900">{fourPsBeneficiaries}</span>
            </div>
          </div>
          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Population by purok</h4>
          <div className="mt-2 space-y-2">
            {zones.slice(0, 6).map((zone) => {
              const width = Math.round((zone.count / zoneMax) * 100);

              return (
                <div key={zone.zone}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-700">
                    <span>{zone.zone}</span>
                    <span>{zone.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200">
                    <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
