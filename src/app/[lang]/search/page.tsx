import Link from "next/link";
import { Star, ArrowRight, Bus } from "lucide-react";
import { searchTrips, searchTripsByRoute, ApiError, type TripSearchResult } from "@/lib/api";
import { ImageCarousel } from "@/components/image-carousel";
import { DateFilter } from "./date-filter";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "today" for the current date, else "22nd June". */
function pageTitleDate(dateIso: string) {
  if (dateIso === todayIso()) return "today";
  const d = new Date(`${dateIso}T00:00:00`);
  const month = d.toLocaleDateString("en-LK", { month: "long" });
  return `${ordinal(d.getDate())} ${month}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}

function duration(depart: string, arrive: string) {
  const mins = Math.round((new Date(arrive).getTime() - new Date(depart).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function TripCard({ trip }: { trip: TripSearchResult }) {
  const dur = duration(trip.boarding_at, trip.drop_at);
  const overnight =
    new Date(trip.drop_at).toDateString() !== new Date(trip.boarding_at).toDateString();
  const amenities = trip.bus_amenities.slice(0, 4);

  return (
    <div className="card card-hover overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* thumbnail — flush to the card edge, full height on desktop */}
        <div className="relative h-36 w-full shrink-0 sm:h-auto sm:w-56">
          {trip.bus_images.length > 0 ? (
            <ImageCarousel images={trip.bus_images} alt={`${trip.bus_reg_no} photos`} />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
            >
              {trip.operator_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trip.operator_logo_url}
                  alt={`${trip.operator_name} logo`}
                  className="h-12 w-12 rounded-lg border border-white/30 bg-white object-cover"
                />
              ) : (
                <span className="font-heading text-2xl font-bold text-white">
                  {trip.operator_name.slice(0, 1)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        {/* main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill">{trip.bus_type_class.replace("_", " ")}</span>
            <span className="ui flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <Bus size={14} className="shrink-0 text-slate-400 dark:text-zinc-500" />
              {trip.operator_name} <span className="text-slate-300 dark:text-zinc-700">·</span>{" "}
              {trip.bus_reg_no}
            </span>
            <span className="ui ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {trip.operator_rating.toFixed(1)} · {trip.operator_reliability_score.toFixed(0)}%
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4 sm:gap-6">
            <div>
              <p className="font-heading text-2xl font-bold leading-none">{formatTime(trip.boarding_at)}</p>
              <p className="ui mt-1 truncate text-sm text-slate-500 dark:text-zinc-500">{trip.from_location_name}</p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-zinc-600">
              <span className="ui text-xs font-medium">{dur}</span>
              <div className="flex w-full items-center gap-1">
                <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
                <ArrowRight size={14} />
                <span className="h-px flex-1 bg-slate-200 dark:bg-zinc-700" />
              </div>
              {overnight && (
                <span className="ui text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Arrives next day
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold leading-none">{formatTime(trip.drop_at)}</p>
              <p className="ui mt-1 truncate text-sm text-slate-500 dark:text-zinc-500">{trip.to_location_name}</p>
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <span
                  key={a}
                  className="ui rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* price + cta */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="ui text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              LKR
            </p>
            <p className="font-heading text-2xl font-bold leading-tight text-brand dark:text-blue-400">
              {Number(trip.fare).toLocaleString("en-LK")}
            </p>
          </div>
          <Link
            href={`/trips/${trip.trip_id}?from=${trip.from_stop_id}&to=${trip.to_stop_id}`}
            className="btn-primary"
          >
            Select seats
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}

const BUS_CLASS_LABELS: Record<string, string> = {
  super_luxury: "Super Luxury",
  luxury: "Luxury (A/C)",
  semi_luxury: "Semi Luxury",
  normal: "Normal",
};

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    routeCardId?: string;
    routeId?: string;
    date?: string;
    class?: string;
  }>;
}) {
  const { from, to, routeCardId, routeId, date, class: busClass } = await searchParams;

  if (!(from && to) && !routeCardId && !routeId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-slate-600 dark:text-zinc-400">
          Missing search parameters.{" "}
          <Link href="/" className="font-medium text-brand underline dark:text-blue-400">
            Start a new search
          </Link>
          .
        </p>
      </div>
    );
  }

  // No date in the URL yet (e.g. a bookmarked link) — default to today.
  const effectiveDate = date || todayIso();
  const baseQuery =
    (from && to ? `from=${from}&to=${to}` : routeCardId ? `routeCardId=${routeCardId}` : `routeId=${routeId}`) +
    (busClass ? `&class=${busClass}` : "");

  let trips: TripSearchResult[] = [];
  let error: string | null = null;
  try {
    trips =
      from && to
        ? await searchTrips({ from, to, date: effectiveDate })
        : await searchTripsByRoute({ routeCardId, routeId, date: effectiveDate });
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  // Class filtering happens here rather than in search_trips itself — every
  // trip already carries bus_type_class, so there's no need for a new RPC
  // parameter just to drop rows the client can filter directly.
  const filteredTrips = busClass ? trips.filter((t) => t.bus_type_class === busClass) : trips;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Available buses for {pageTitleDate(effectiveDate)}
        </h1>
        <DateFilter baseQuery={baseQuery} date={effectiveDate} />
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!error && filteredTrips.length === 0 && (
        <div className="card p-12 text-center text-slate-500 dark:text-zinc-400">
          {trips.length === 0
            ? `No trips found for this route on ${effectiveDate}. Try another date above.`
            : `No ${BUS_CLASS_LABELS[busClass ?? ""] ?? busClass} buses on this route for ${effectiveDate}.`}
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {filteredTrips.map((trip) => (
          <TripCard key={`${trip.trip_id}-${trip.from_stop_id}-${trip.to_stop_id}`} trip={trip} />
        ))}
      </div>
    </div>
  );
}
