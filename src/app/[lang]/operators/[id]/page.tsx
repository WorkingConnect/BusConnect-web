import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Star,
  Armchair,
  Wifi,
  Snowflake,
  Usb,
  Plug,
  Tv,
  Camera,
  Navigation,
  Lightbulb,
  BedDouble,
  Toilet,
  Accessibility,
  Luggage,
  DoorOpen,
  Flame,
  CupSoda,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { getOperatorProfile } from "@/lib/operators";
import { formatDuration } from "@/lib/popular-routes";
import { relativeDateLabel } from "@/components/route-card";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import { BUS_CLASSES } from "@/lib/bus-constants";

// Maps the fixed amenity labels operators pick from (see
// src/lib/bus-constants.ts PREDEFINED_AMENITIES) to an icon. Operators can
// also type a free-text amenity that won't be a key here — Sparkles covers
// that case.
const AMENITY_ICONS: Record<string, LucideIcon> = {
  "Air Conditioning (AC)": Snowflake,
  "Wi-Fi": Wifi,
  "USB Charging": Usb,
  "Power Outlets": Plug,
  "Reclining Seats": Armchair,
  "TV / Entertainment": Tv,
  CCTV: Camera,
  "GPS Tracking": Navigation,
  "Reading Lights": Lightbulb,
  "Blankets (Sleeper)": BedDouble,
  Washroom: Toilet,
  "Wheelchair Accessible": Accessibility,
  "Luggage Storage": Luggage,
  Refreshments: CupSoda,
  "Emergency Exit": DoorOpen,
  "Fire Extinguisher": Flame,
};

/** "semi_luxury" -> "Semi Luxury", using the same canonical labels as the
 *  operator's own fleet-registration form (src/lib/bus-constants.ts). */
function classLabel(cls: string): string {
  return BUS_CLASSES.find((c) => c.value === cls)?.label ?? cls.replace(/_/g, " ");
}

export default async function OperatorPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const profile = await getOperatorProfile(id);

  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          Operator not found.
        </p>
        <Link
          href={localizePath(locale, "/")}
          className="ui mt-4 inline-block text-sm font-medium text-brand underline dark:text-blue-400"
        >
          Back home
        </Link>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  const totalBuses = profile.fleet.reduce((n, f) => n + f.busCount, 0);
  const dailyDepartures = profile.routes.reduce((n, r) => n + r.todayCount, 0);
  const allAmenities = [...new Set(profile.fleet.flatMap((f) => f.amenities))].sort((a, b) =>
    a.localeCompare(b),
  );
  const coverageStats: [string, number][] = [
    ["Daily departures", dailyDepartures],
    ["Cities served", profile.citiesServed],
    ["Routes", profile.routes.length],
    ["Buses", totalBuses],
  ];

  return (
    <>
      {/* ── Hero — text left, operator photo right (homepage hero layout) ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-soft/50 via-transparent to-transparent dark:from-brand-soft-dark/25" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
          <nav className="ui flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
            <Link href={localizePath(locale, "/")} className="hover:text-slate-900 dark:hover:text-white">
              Home
            </Link>
            <ChevronRight size={12} />
            <span className="font-medium text-slate-700 dark:text-zinc-300">{profile.name}</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div>
              <div className="flex items-center gap-3">
                {profile.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logoUrl}
                    alt={`${profile.name} logo`}
                    className="h-12 w-12 shrink-0 rounded-2xl border border-border bg-card object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft font-heading text-lg font-bold text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                    {profile.name.slice(0, 1)}
                  </span>
                )}
                <span className="ui inline-flex items-center gap-1.5 text-xs font-bold text-black dark:text-white">
                  Verified Operator
                  <Image src="/verified-badge.jpg" alt="" width={16} height={16} className="rounded-sm" />
                </span>
              </div>

              <h1 className="mt-4 font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                Book <span className="text-brand dark:text-blue-400">{profile.name}</span> bus tickets
              </h1>
              <p className="mt-4 max-w-xl text-sm text-slate-600 dark:text-zinc-400">
                Compare live seat availability and fares for every {profile.name} departure on BusConnect.
              </p>

              <div className="ui mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-zinc-400">
                {profile.rating > 0 ? (
                  <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-white">
                    <Star size={15} className="fill-amber-400 text-amber-400" />
                    {profile.rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="font-medium text-slate-900 dark:text-white">Not yet rated</span>
                )}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl shadow-black/10 dark:shadow-black/40">
                <Image
                  src="/operator-hero.jpg"
                  alt={`${profile.name} bus`}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {/* ── Routes table ── */}
        <section>
          <h2 className="font-heading text-center text-lg font-bold tracking-tight sm:text-xl">
            <span className="text-brand dark:text-blue-400">{profile.name}</span> popular routes and schedules
          </h2>
          {profile.routes.length === 0 ? (
            <p className="ui mt-4 text-sm text-slate-500 dark:text-zinc-500">No routes assigned yet.</p>
          ) : (
            <div className="card mt-4 divide-y divide-border overflow-hidden">
              <div className="ui hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] gap-4 bg-muted/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500 sm:grid">
                <span>Route</span>
                <span>First and last departures</span>
                <span>Departures</span>
                <span>Duration</span>
                <span>Fare</span>
                <span />
              </div>
              {profile.routes.map((r) => {
                const dur = formatDuration(r.durationMinutes);
                const query = r.routeCardId ? `routeCardId=${r.routeCardId}` : `routeId=${r.routeId}`;
                return (
                  <Link
                    key={r.routeCardId ?? r.routeId}
                    href={localizePath(locale, `/search?${query}&date=${today}&operator=${profile.id}`)}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-muted sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto] sm:items-center sm:gap-4"
                  >
                    <span className="font-heading font-semibold">{r.name}</span>
                    <span className="ui text-sm text-slate-600 dark:text-zinc-400">
                      {r.firstDeparture && r.lastDeparture
                        ? `${r.firstDeparture} — ${r.lastDeparture}`
                        : "—"}
                    </span>
                    <div className="flex items-center justify-between sm:contents">
                      <span className="ui text-sm text-slate-600 dark:text-zinc-400">
                        {r.todayCount > 0
                          ? `${r.todayCount} today`
                          : r.nextDateIso
                            ? `Next ${relativeDateLabel(r.nextDateIso, today)}`
                            : "No trips scheduled"}
                      </span>
                      <span className="ui text-sm text-slate-600 dark:text-zinc-400">{dur || "—"}</span>
                    </div>
                    <span className="font-heading text-base font-bold text-brand dark:text-blue-400 sm:text-sm">
                      {r.minFare != null
                        ? `LKR ${r.minFare.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </span>
                    <span className="btn-primary mt-1 inline-flex w-full justify-center px-4 py-2 text-xs sm:mt-0 sm:w-auto">
                      Search buses <ChevronRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Operator details — one card, sub-sections separated by dividers ── */}
        <div className="card mt-8 divide-y divide-border overflow-hidden">
          {allAmenities.length > 0 && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">
                Amenities on {profile.name} buses
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {allAmenities.map((a) => {
                  const Icon = AMENITY_ICONS[a] ?? Sparkles;
                  return (
                    <span
                      key={a}
                      className="ui inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300"
                    >
                      <Icon size={13} className="text-brand dark:text-blue-400" />
                      {a}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-5 sm:p-6">
            <h2 className="font-heading text-base font-bold sm:text-lg">
              {profile.name}&apos;s coverage in numbers
            </h2>
            <dl className="mt-3 divide-y divide-border">
              {coverageStats.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-slate-600 dark:text-zinc-400">{label}</dt>
                  <dd className="font-heading font-bold">{value.toLocaleString("en-LK")}</dd>
                </div>
              ))}
            </dl>
          </div>

          {profile.fleet.length > 0 && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">{profile.name} bus classes</h2>
              <div className="mt-3 divide-y divide-border">
                {profile.fleet.map((f) => (
                  <div key={f.busTypeId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{classLabel(f.class)}</p>
                      <p className="ui text-xs text-slate-500 dark:text-zinc-500">
                        {f.seatCount} seats · {f.busCount} {f.busCount === 1 ? "bus" : "buses"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-slate-400 dark:text-zinc-600">
                      {f.amenities.slice(0, 4).map((a) => {
                        const Icon = AMENITY_ICONS[a] ?? Sparkles;
                        return <Icon key={a} size={15} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
