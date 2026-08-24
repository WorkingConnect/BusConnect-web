import Link from "next/link";
import { ArrowLeft, Star, ShieldCheck, MapPin, User } from "lucide-react";
import {
  getTrip,
  getSeatmap,
  getTripCrew,
  ApiError,
  type TripDetail,
  type SeatMap,
  type TripCrew,
} from "@/lib/api";
import { SeatSelector } from "./seat-selector";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from, to } = await searchParams;

  let trip: TripDetail | null = null;
  let seatmap: SeatMap | null = null;
  let crew: TripCrew | null = null;
  let error: string | null = null;

  try {
    [trip, seatmap] = await Promise.all([getTrip(id), getSeatmap(id)]);
    crew = await getTripCrew(id).catch(() => null);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !trip) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Trip not found."}
        </p>
        <Link href="/" className="ui mt-4 inline-block text-sm font-medium text-brand underline dark:text-blue-400">
          Back to search
        </Link>
      </div>
    );
  }

  const stops = [...trip.stops].sort((a, b) => a.seq - b.seq);
  // Fall back to the route's full endpoints when the page is opened directly
  // (no ?from=&to= from a search result), e.g. a shared/bookmarked link.
  const fromStopId = (from && stops.some((s) => s.route_stop_id === from) ? from : stops[0]?.route_stop_id) ?? "";
  const toStopId =
    (to && stops.some((s) => s.route_stop_id === to) ? to : stops[stops.length - 1]?.route_stop_id) ?? "";

  const fareOverride = trip.fares.find(
    (f) => f.from_stop_id === fromStopId && f.to_stop_id === toStopId,
  );
  const farePerSeat = Number(fareOverride?.fare ?? trip.base_fare);

  const boardStop = stops.find((s) => s.route_stop_id === fromStopId);
  const dropStop = stops.find((s) => s.route_stop_id === toStopId);

  const operator = trip.bus.operator;
  const operatorName = operator?.name ?? "Operator";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> New search
      </Link>

      {/* header banner — flat brand blue, clean Facebook-style meta line. */}
      <header className="mt-4 overflow-hidden rounded-3xl bg-brand p-6 sm:p-8">
        <div className="flex items-center gap-3 text-white">
          {operator?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={operator.logo_url}
              alt={`${operatorName} logo`}
              className="h-12 w-12 shrink-0 rounded-2xl border border-white/30 bg-white object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 font-heading text-lg font-bold backdrop-blur">
              {operatorName.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {operatorName}
            </h1>
            <p className="ui truncate text-sm text-white/80">
              {trip.route.name} · Bus {trip.bus.reg_no}
            </p>
          </div>
        </div>
        <div className="ui mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg bg-white/20 px-3 py-1.5 font-medium capitalize text-white">
            {trip.bus.bus_type.class.replace("_", " ")}
          </span>
          <span className="rounded-lg bg-white/20 px-3 py-1.5 font-medium text-white">
            Board {boardStop ? formatDateTime(boardStop.scheduled_at ?? trip.depart_at) : formatDateTime(trip.depart_at)}
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 font-medium text-white">
            <Star size={13} className="fill-amber-300 text-amber-300" />
            {(operator?.rating ?? 0).toFixed(1)}
          </span>
        </div>
      </header>

      {/* 12-col: 8 main (seat map) + 4 sidebar. Below lg, order is flipped so
          the journey/trip details lead and the seat map sits at the bottom —
          matching the mobile app's screen order (trip info, then seats). */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="order-2 lg:order-1 lg:col-span-8">
          <h2 className="mb-4 font-heading text-xl font-semibold">Select your seats</h2>
          <SeatSelector
            tripId={trip.id}
            layout={seatmap?.layout ?? trip.bus.bus_type.layout_json ?? null}
            seatCount={trip.bus.bus_type.seat_count}
            initialSeats={seatmap?.seats ?? []}
            farePerSeat={farePerSeat}
            fromStopId={fromStopId}
            toStopId={toStopId}
            stops={stops}
          />
        </section>

        <aside className="order-1 lg:order-2 lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <div className="card p-5">
              <h3 className="font-heading font-semibold">Your journey</h3>
              {boardStop && dropStop && (
                <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  Boarding at <span className="font-medium text-slate-700 dark:text-zinc-300">{boardStop.location_name}</span>,
                  dropping at <span className="font-medium text-slate-700 dark:text-zinc-300">{dropStop.location_name}</span>
                </p>
              )}
              <ol className="mt-4 space-y-4">
                {stops.map((s) => {
                  const isBoard = s.route_stop_id === fromStopId;
                  const isDrop = s.route_stop_id === toStopId;
                  const inSegment = boardStop && dropStop && s.seq >= boardStop.seq && s.seq <= dropStop.seq;
                  return (
                    <li key={s.route_stop_id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <MapPin
                          size={16}
                          className={
                            isBoard || isDrop
                              ? "text-brand dark:text-blue-400"
                              : inSegment
                                ? "text-slate-400 dark:text-zinc-500"
                                : "text-slate-300 dark:text-zinc-700"
                          }
                        />
                        {s.seq < stops.length && (
                          <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-zinc-800" />
                        )}
                      </div>
                      <div className="-mt-0.5">
                        <p
                          className={`font-medium ${!inSegment ? "text-slate-400 dark:text-zinc-600" : ""}`}
                        >
                          {s.location_name}
                          {isBoard && (
                            <span className="ui ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Board
                            </span>
                          )}
                          {isDrop && (
                            <span className="ui ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              Drop
                            </span>
                          )}
                        </p>
                        <p className="ui text-xs text-slate-500 dark:text-zinc-500">
                          {s.scheduled_at ? formatTime(s.scheduled_at) : "—"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {trip.bus.amenities.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
                  <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    On board
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {trip.bus.amenities.map((a) => (
                      <span
                        key={a}
                        className="ui rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(crew?.driver || crew?.conductor) && (
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800">
                  <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
                    Your crew
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-4">
                    {crew.driver && <CrewBadge role="Driver" member={crew.driver} />}
                    {crew.conductor && <CrewBadge role="Conductor" member={crew.conductor} />}
                  </div>
                </div>
              )}

              <div className="ui mt-5 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
                <ShieldCheck size={15} className="text-emerald-500" />
                Secure checkout · Instant e-ticket · QR boarding
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CrewBadge({ role, member }: { role: string; member: { name: string; photoUrl: string | null } }) {
  return (
    <div className="flex items-center gap-2.5">
      {member.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photoUrl}
          alt={`${member.name} photo`}
          className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
          <User size={16} />
        </div>
      )}
      <div>
        <p className="ui text-[11px] uppercase tracking-wide text-slate-500 dark:text-zinc-500">{role}</p>
        <p className="text-sm font-medium">{member.name}</p>
      </div>
    </div>
  );
}
