function Shimmer({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div aria-hidden="true" className={`relative isolate overflow-hidden bg-slate-200 ${rounded} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[employee-shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  )
}

export function CompanyEmployeesShimmer() {
  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Breadcrumb and actions: h-10 */}
      <div className="flex min-h-10 items-center justify-between gap-2">
        <Shimmer className="h-4 w-28" />

        <div className="flex h-10 shrink-0 items-center gap-2">
          <Shimmer className="h-9 w-9 sm:w-24" />
          <Shimmer className="h-9 w-16 sm:w-36" />
        </div>
      </div>

      {/* Statistics: same 3-column responsive grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 h-22">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-3.5 w-28 max-w-full" />
              <Shimmer className="mt-1 h-7 w-12" />
            </div>

            <Shimmer className="h-10 w-10 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Employee list container */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Section heading and search */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="space-y-2">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 w-40" />
          </div>

          <Shimmer className="h-9 w-full rounded-lg sm:max-w-xs" />
        </div>

        {/* Desktop table skeleton */}
        <div className="hidden overflow-hidden md:block">
          <div className="grid grid-cols-[1.15fr_1.2fr_1.1fr_0.7fr_0.65fr] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
            {['Employee', 'Contact', 'Roles', 'Status', 'Actions'].map((item) => (
              <Shimmer key={item} className="h-3 w-16 max-w-full" />
            ))}
          </div>

          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid min-h-[76px] grid-cols-[1.15fr_1.2fr_1.1fr_0.7fr_0.65fr] items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
              {/* Employee name and avatar */}
              <div className="flex min-w-0 items-center gap-2.5">
                <Shimmer className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Shimmer className="h-3.5 w-28 max-w-full" />
                  <Shimmer className="h-2.5 w-20 max-w-full" />
                </div>
              </div>

              {/* Contact */}
              <div className="min-w-0 space-y-2">
                <Shimmer className="h-3 w-full max-w-40" />
                <Shimmer className="h-3 w-20 max-w-full" />
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-1">
                <Shimmer className="h-6 w-16" />
                {index % 2 === 0 && <Shimmer className="h-6 w-14" />}
              </div>

              {/* Status */}
              <Shimmer className="h-6 w-16 rounded-full" />

              {/* Action buttons */}
              <div className="flex justify-end gap-1.5">
                {Array.from({ length: 3 }, (_, actionIndex) => (
                  <Shimmer key={actionIndex} className="h-8 w-8 shrink-0 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile cards skeleton */}
        <div className="divide-y divide-slate-100 md:hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3 p-3">
              <div className="flex items-start gap-2.5">
                <Shimmer className="h-10 w-10 shrink-0 rounded-lg" />

                <div className="min-w-0 flex-1 space-y-2">
                  <Shimmer className="h-4 w-32 max-w-full" />
                  <Shimmer className="h-3 w-44 max-w-full" />
                  {index % 2 === 0 && <Shimmer className="h-3 w-24 max-w-full" />}
                </div>

                <Shimmer className="h-6 w-16 shrink-0 rounded-full" />
              </div>

              <div className="flex flex-wrap gap-1">
                <Shimmer className="h-6 w-20" />
                {index % 2 === 0 && <Shimmer className="h-6 w-16" />}
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-2.5">
                <Shimmer className="h-9 flex-1" />
                <Shimmer className="h-9 flex-1" />
                <Shimmer className="h-9 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function EmployeeFormShimmer() {
  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Breadcrumb and access control */}
      <div className="flex h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-3.5 w-3" />
          <Shimmer className="h-3.5 w-28" />
        </div>

        <Shimmer className="h-8 w-28 shrink-0 rounded-lg" />
      </div>

      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <Shimmer className="h-6 w-36" />
          <Shimmer className="h-3 w-64 max-w-full" />
        </div>
      </div>

      <div className="space-y-3">
        {/* Personal Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Shimmer className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-3 w-32" />
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="min-w-0 space-y-1">
                <Shimmer className="h-3 w-24 max-w-full" />
                <Shimmer className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </section>

        {/* Assign Roles */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <Shimmer className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-3 w-36" />
            </div>
          </div>

          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Shimmer className="h-7 w-7 shrink-0 rounded-md" />
                    <Shimmer className="h-3.5 w-20 max-w-full" />
                  </div>
                  <Shimmer className="h-5 w-5 shrink-0 rounded-full" />
                </div>

                <Shimmer className="mt-2 h-3 w-32 max-w-full" />

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <Shimmer className="h-3 w-20" />
                  <Shimmer className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Permissions */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Shimmer className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-3 w-36" />
              </div>
            </div>

            <Shimmer className="h-7 w-24 rounded-lg" />
          </div>

          <div className="space-y-3 p-3">
            {/* Search and enable all */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Shimmer className="h-9 w-full rounded-lg sm:max-w-xs" />
              <Shimmer className="h-4 w-20" />
            </div>

            {/* Information message */}
            <Shimmer className="h-10 w-full rounded-lg" />

            {/* Permission sections */}
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Shimmer className="h-7 w-7 shrink-0 rounded-md" />
                      <div className="space-y-1.5">
                        <Shimmer className="h-3.5 w-20" />
                        <Shimmer className="h-2.5 w-16" />
                      </div>
                    </div>
                    <Shimmer className="h-3 w-14" />
                  </div>

                  <div className="divide-y divide-slate-100 px-2.5">
                    {Array.from({ length: 4 }, (_, permissionIndex) => (
                      <div key={permissionIndex} className="flex items-center gap-2 py-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Shimmer className="h-3 w-24 max-w-full" />
                          <Shimmer className="h-2.5 w-full max-w-40" />
                        </div>
                        <Shimmer className="h-5 w-9 shrink-0 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom action bar */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <Shimmer className="h-9 w-24 rounded-lg" />
          <Shimmer className="h-9 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  )
}



function DetailsShimmerLine({ className = '' }) {
  return (
    <Shimmer
      className={`bg-slate-200 ${className}`}
      rounded="rounded-md"
    />
  )
}

function DetailsShimmerField({ wide = false }) {
  return (
    <div
      className={`min-w-0 rounded-lg border border-slate-200 p-3 ${
        wide ? 'sm:col-span-2' : ''
      }`}
    >
      <DetailsShimmerLine className="mb-3 h-3 w-24" />
      <DetailsShimmerLine className="h-4 w-full max-w-52" />
    </div>
  )
}

function DetailsShimmerHeading() {
  return (
    <div className="mb-4 flex items-center gap-3">
      <DetailsShimmerLine className="h-10 w-10 shrink-0 rounded-lg" />

      <div className="min-w-0 flex-1 space-y-2">
        <DetailsShimmerLine className="h-4 w-36 max-w-full" />
        <DetailsShimmerLine className="h-3 w-48 max-w-full" />
      </div>
    </div>
  )
}

export function CompanyEmployeeDetailsShimmer() {
  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Breadcrumb + Actions */}
      <div className="flex min-h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <DetailsShimmerLine className="h-3 w-20" />
          <DetailsShimmerLine className="h-3 w-3" />
          <DetailsShimmerLine className="h-3 w-28" />
        </div>

        <div className="flex shrink-0 gap-2">
          <DetailsShimmerLine className="h-9 w-9 sm:w-24" />
          <DetailsShimmerLine className="h-9 w-[76px]" />
        </div>
      </div>

      {/* Employee Header */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-slate-200" />

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:min-h-[88px] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <DetailsShimmerLine className="h-11 w-11 shrink-0 rounded-xl" />

            <div className="min-w-0 flex-1 space-y-2">
              <DetailsShimmerLine className="h-5 w-44 max-w-full" />
              <DetailsShimmerLine className="h-3 w-28" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
            <div className="min-w-0 space-y-2">
              <DetailsShimmerLine className="h-3 w-24" />
              <div className="flex flex-wrap gap-3">
                <DetailsShimmerLine className="h-4 w-24" />
                <DetailsShimmerLine className="h-4 w-20" />
              </div>
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex shrink-0 items-center gap-2">
              <DetailsShimmerLine className="h-2 w-2 rounded-full" />
              <div className="space-y-2">
                <DetailsShimmerLine className="h-3 w-24" />
                <DetailsShimmerLine className="h-4 w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personal + Account Information */}
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <DetailsShimmerHeading />

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailsShimmerField />
            <DetailsShimmerField />
            <DetailsShimmerField />
            <DetailsShimmerField />
          </div>

          <DetailsShimmerLine className="mt-4 h-3 w-56 max-w-full" />
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <DetailsShimmerHeading />

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailsShimmerField />
            <DetailsShimmerField />
            <DetailsShimmerField wide />
            <DetailsShimmerField wide />
          </div>
        </section>
      </div>

      {/* Permissions Overview */}
      <section className="min-w-0 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <DetailsShimmerHeading />
          <DetailsShimmerLine className="h-8 w-28 rounded-lg" />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="min-w-0 rounded-lg border border-slate-200 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <DetailsShimmerLine className="h-3 w-28 max-w-full" />
                <DetailsShimmerLine className="h-5 w-6 rounded-md" />
              </div>

              <div className="flex flex-wrap gap-2">
                <DetailsShimmerLine className="h-7 w-16 rounded-md" />
                <DetailsShimmerLine className="h-7 w-20 rounded-md" />
                <DetailsShimmerLine className="h-7 w-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        <DetailsShimmerLine className="mt-4 h-10 w-full rounded-lg" />
      </section>
    </div>
  )
}