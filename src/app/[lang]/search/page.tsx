import Link from "next/link";
import { searchTrips, searchTripsByRoute, ApiError, type TripSearchResult } from "@/lib/api";
import { DateFilter } from "./date-filter";
import { TripResults } from "./trip-results";

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
    operator?: string;
  }>;
}) {
  const { from, to, routeCardId, routeId, date, class: busClass, operator } = await searchParams;

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

      {!error && (
        <TripResults
          trips={trips}
          effectiveDate={effectiveDate}
          initialBusType={busClass}
          initialOperator={operator}
        />
      )}
    </div>
  );
}
