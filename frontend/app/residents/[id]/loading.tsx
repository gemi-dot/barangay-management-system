export default function ResidentDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-9 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-48 animate-pulse rounded bg-gray-200" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl bg-white p-5 shadow">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </article>

          <article className="rounded-xl bg-white p-5 shadow">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
