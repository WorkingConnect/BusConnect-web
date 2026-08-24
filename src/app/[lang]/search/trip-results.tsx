"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, ArrowRight, Bus, ChevronDown } from "lucide-react";
import { ImageCarousel } from "@/components/image-carousel";
import type { TripSearchResult } from "@/lib/api";

const BUS_CLASS_LABELS: Record<string, string> = {
  super_luxury: "Super Luxury",
  luxury: "Luxury (A/C)",
  semi_luxury: "Semi Luxury",
  normal: "Normal",
  expressway: "Expressway",
};

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
    <div className={["card overflow-hidden", trip.booking_closed ? "opacity-60" : "card-hover"].join(" ")}>
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
            {trip.booking_closed && (
              <span className="ui rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                Booking closed
              </span>
            )}
            <span className="ui flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400">
              <Bus size={14} className="shrink-0 text-slate-400 dark:text-zinc-500" />
              {trip.operator_name} <span className="text-slate-300 dark:text-zinc-700">·</span>{" "}
              {trip.bus_reg_no}
            </span>
            <span className="ui ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {trip.operator_rating.toFixed(1)}
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
          {trip.booking_closed ? (
            <span className="btn-primary pointer-events-none opacity-60">Booking closed</span>
          ) : (
            <Link
              href={`/trips/${trip.trip_id}?from=${trip.from_stop_id}&to=${trip.to_stop_id}`}
              className="btn-primary"
            >
              Select seats
            </Link>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Operator + bus type filters, derived from whatever trips actually came
 * back (mirrors BusConnect-mobile's search-results screen, which only ever
 * offers a bus-type filter for classes present in the current result set).
 * Filtering happens client-side over the already-fetched trips — no new API
 * parameter, same approach the old server-side `?class=` filter used.
 */
export function TripResults({
  trips,
  effectiveDate,
  initialBusType,
  initialOperator,
}: {
  trips: TripSearchResult[];
  effectiveDate: string;
  initialBusType?: string;
  /** Pre-selects the operator filter — set when arriving from an operator's
   *  own "routes we run" table, so results start scoped to that operator. */
  initialOperator?: string;
}) {
  const [operatorFilter, setOperatorFilter] = useState<string | null>(initialOperator ?? null);
  const [busTypeFilter, setBusTypeFilter] = useState<string | null>(initialBusType ?? null);

  const operators = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of trips) byId.set(t.operator_id, t.operator_name);
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [trips]);

  const busTypes = useMemo(
    () => [...new Set(trips.map((t) => t.bus_type_class))].sort(),
    [trips],
  );

  const filteredTrips = useMemo(
    () =>
      trips.filter(
        (t) =>
          (!operatorFilter || t.operator_id === operatorFilter) &&
          (!busTypeFilter || t.bus_type_class === busTypeFilter),
      ),
    [trips, operatorFilter, busTypeFilter],
  );

  return (
    <>
      {(operators.length > 0 || busTypes.length > 0) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {operators.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="ui text-sm font-medium text-slate-600 dark:text-zinc-400">Operator</span>
              <span className="relative block">
                <select
                  value={operatorFilter ?? ""}
                  onChange={(e) => setOperatorFilter(e.target.value || null)}
                  className="field cursor-pointer appearance-none pr-9"
                >
                  <option value="">All operators</option>
                  {operators.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500"
                />
              </span>
            </label>
          )}
          {busTypes.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="ui text-sm font-medium text-slate-600 dark:text-zinc-400">Bus type</span>
              <span className="relative block">
                <select
                  value={busTypeFilter ?? ""}
                  onChange={(e) => setBusTypeFilter(e.target.value || null)}
                  className="field cursor-pointer appearance-none pr-9"
                >
                  <option value="">All bus types</option>
                  {busTypes.map((c) => (
                    <option key={c} value={c}>
                      {BUS_CLASS_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-500"
                />
              </span>
            </label>
          )}
        </div>
      )}

      {filteredTrips.length === 0 ? (
        <div className="card p-12 text-center text-slate-500 dark:text-zinc-400">
          {trips.length === 0
            ? `No trips found for this route on ${effectiveDate}. Try another date above.`
            : "No buses match these filters."}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredTrips.map((trip) => (
            <TripCard key={`${trip.trip_id}-${trip.from_stop_id}-${trip.to_stop_id}`} trip={trip} />
          ))}
        </div>
      )}
    </>
  );
}
