import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Users,
  PlusCircle,
  ChevronRight,
  ArrowRight,
  Clock,
  Ban,
  Bus as BusIcon,
  ScanLine,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOperator,
  listOperatorTrips,
  getOperatorAnalytics,
  listJourneys,
  getMyAssignment,
  ApiError,
  type OperatorMembership,
  type OperatorTrip,
  type OperatorAnalytics,
  type OperatorJourney,
  type MyAssignment,
} from "@/lib/api";
import { formatTime } from "@/lib/journey-format";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OperatorOverviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access your operator dashboard
      </Link>
    );
  }

  let membership: OperatorMembership | null = null;
  let notLinked = false;
  let error: string | null = null;

  try {
    membership = await getMyOperator(session.access_token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      notLinked = true;
    } else {
      error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
    }
  }

  if (notLinked) {
    return (
      <div className="card p-10 text-center">
        <Building2 size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />
        <p className="mt-4 font-heading font-semibold">Run a bus fleet?</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Apply to list your buses on BusConnect and reach passengers across the country.
        </p>
        <Link href="/operator/apply" className="btn-primary mt-5">
          <PlusCircle size={16} /> Apply as an operator
        </Link>
      </div>
    );
  }

  if (error || !membership) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Could not load your operator dashboard."}
      </p>
    );
  }

  const { operator, role } = membership;

  if (operator.status === "pending") {
    return (
      <div className="card p-10 text-center">
        {operator.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={operator.logo_url}
            alt={`${operator.name} logo`}
            className="mx-auto h-16 w-16 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <Clock size={32} className="mx-auto text-amber-500" />
        )}
        <p className="mt-4 font-heading font-semibold">{operator.name} — application under review</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          BusConnect is reviewing your application. You&apos;ll be able to run journeys once approved.
        </p>
      </div>
    );
  }

  if (operator.status === "suspended") {
    return (
      <div className="card border-red-200 p-10 text-center dark:border-red-900/50">
        <Ban size={32} className="mx-auto text-red-500" />
        <p className="mt-4 font-heading font-semibold">{operator.name} — account suspended</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Contact BusConnect support to resolve this.
        </p>
      </div>
    );
  }

  let trips: OperatorTrip[] = [];
  let analytics: OperatorAnalytics | null = null;
  let journeys: OperatorJourney[] = [];
  let assignment: MyAssignment | null = null;
  try {
    if (role === "owner") {
      [trips, analytics, journeys] = await Promise.all([
        listOperatorTrips(session.access_token),
        getOperatorAnalytics(session.access_token),
        listJourneys(session.access_token),
      ]);
    } else {
      [trips, assignment] = await Promise.all([
        listOperatorTrips(session.access_token),
        getMyAssignment(session.access_token).catch(() => null),
      ]);
    }
  } catch (e) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {e instanceof ApiError ? e.message : "Could not load trips."}
      </p>
    );
  }

  const now = Date.now();
  const upcomingTrips = trips
    .filter((t) => new Date(t.depart_at).getTime() > now && t.status !== "cancelled")
    .sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());
  const activeJourneyCount = journeys.filter((j) => j.status === "active").length;

  // Group upcoming departures by their parent journey — the dashboard shows
  // one card per journey (soonest departure + how many more are scheduled)
  // rather than a flat trip list; drilling into a journey shows its full
  // upcoming-departures list. Ad-hoc trips with no journey_id (e.g. admin-
  // created) get their own bucket so they're never silently dropped.
  const journeyById = new Map(journeys.map((j) => [j.id, j] as const));
  const tripsByJourney = new Map<string, OperatorTrip[]>();
  const adHocTrips: OperatorTrip[] = [];
  for (const t of upcomingTrips) {
    if (t.journey_id && journeyById.has(t.journey_id)) {
      const list = tripsByJourney.get(t.journey_id) ?? [];
      list.push(t);
      tripsByJourney.set(t.journey_id, list);
    } else {
      adHocTrips.push(t);
    }
  }
  const journeyGroups = [...tripsByJourney.entries()]
    .map(([journeyId, journeyTrips]) => ({ journey: journeyById.get(journeyId)!, trips: journeyTrips }))
    .sort((a, b) => new Date(a.trips[0].depart_at).getTime() - new Date(b.trips[0].depart_at).getTime());

  const GROUPS_SHOWN = 6;
  const shownGroups = journeyGroups.slice(0, GROUPS_SHOWN);
  const moreGroupsCount = journeyGroups.length - shownGroups.length;

  const AD_HOC_SHOWN = 4;
  const shownAdHoc = adHocTrips.slice(0, AD_HOC_SHOWN);
  const moreAdHocCount = adHocTrips.length - shownAdHoc.length;

  // Pilots aren't grouped by journey — they just see their assigned bus's
  // upcoming trips as a flat list, same as before.
  const PILOT_DEPARTURES_SHOWN = 8;
  const shownTrips = upcomingTrips.slice(0, PILOT_DEPARTURES_SHOWN);
  const moreTripsCount = upcomingTrips.length - shownTrips.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {operator.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={operator.logo_url}
              alt={`${operator.name} logo`}
              className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
            />
          )}
          <div>
            <p className="ui text-sm text-slate-500 dark:text-zinc-400">
              {role === "owner"
                ? "Operator dashboard"
                : assignment?.pilot?.assigned_role
                  ? `${assignment.pilot.assigned_role[0].toUpperCase()}${assignment.pilot.assigned_role.slice(1)} dashboard`
                  : "Crew dashboard"}
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{operator.name}</h1>
          </div>
        </div>
        {role !== "owner" && (
          <Link href="/operator/scan" className="btn-primary shrink-0">
            <ScanLine size={16} /> Scan tickets
          </Link>
        )}
      </div>

      {/* ── Conductor/driver: your assigned bus ─────────────────────────── */}
      {role === "pilot" && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
              <BusIcon size={18} />
            </span>
            <h2 className="font-heading text-xl font-semibold">Your assignment</h2>
          </div>
          {assignment?.bus ? (
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-bold tracking-tight">{assignment.bus.reg_no}</p>
                  <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                    {assignment.bus.bus_type?.name ?? "—"} · {assignment.bus.bus_type?.seat_count ?? "—"} seats
                  </p>
                </div>
                {assignment.pilot?.assigned_role && (
                  <span className="ui rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                    {assignment.pilot.assigned_role}
                  </span>
                )}
              </div>
              {assignment.bus.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {assignment.bus.amenities.map((a) => (
                    <span
                      key={a}
                      className="ui rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-500 dark:text-zinc-400">
              You&apos;re not assigned to a bus yet — your operator will assign you to one, and your trips
              will show up here.
            </div>
          )}
        </section>
      )}

      {role === "owner" && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Active journeys" value={String(activeJourneyCount)} />
          <Stat label="Upcoming trips" value={String(analytics?.upcomingTrips ?? 0)} />
          <Stat label="Bookings" value={String(analytics?.totalBookings ?? 0)} />
          <Stat label="Fill rate" value={`${analytics?.fillRatePct ?? 0}%`} />
          <Stat label="Net earned" value={`LKR ${Number(analytics?.totalNetRevenue ?? 0).toLocaleString("en-LK")}`} />
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
              <TrendingUp size={18} />
            </span>
            <h2 className="font-heading text-xl font-semibold">
              {role === "owner" ? "Upcoming departures" : "Trips you can board"}
            </h2>
          </div>
          {role === "owner" && journeys.length > 0 && (
            <Link
              href="/operator/journeys"
              className="ui flex items-center gap-1 text-sm font-medium text-brand hover:underline dark:text-blue-400"
            >
              All journeys <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {role === "owner" ? (
          journeyGroups.length === 0 && adHocTrips.length === 0 ? (
            <div className="card mt-4 p-10 text-center text-slate-500 dark:text-zinc-400">
              {journeys.length === 0
                ? "No upcoming departures — create a journey, then schedule its dates from the Timetable."
                : "No upcoming departures — schedule some dates for your journeys from the Timetable."}
              <div>
                {journeys.length === 0 ? (
                  <Link href="/operator/journeys/new" className="btn-primary mt-4">
                    <PlusCircle size={16} /> Create your first journey
                  </Link>
                ) : (
                  <Link href="/operator/timetable" className="btn-primary mt-4">
                    <PlusCircle size={16} /> Schedule trips
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* One card per journey — click through for its full upcoming-departures list. */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {shownGroups.map(({ journey, trips: journeyTrips }) => (
                  <Link
                    key={journey.id}
                    href={`/operator/journeys/${journey.id}`}
                    className="card card-hover flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-heading font-semibold">{journey.route?.name ?? "—"}</p>
                        <span className="ui shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                          {journeyTrips.length} upcoming
                        </span>
                      </div>
                      <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                        {formatTime(journey.depart_time)} → {formatTime(journey.arrive_time)}
                      </p>
                      <p className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
                        Next: {formatDateTime(journeyTrips[0].depart_at)} · {journey.bus?.reg_no ?? "—"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
              {moreGroupsCount > 0 && (
                <p className="ui mt-2 px-1 text-center text-sm text-slate-500 dark:text-zinc-400">
                  +{moreGroupsCount} more {moreGroupsCount === 1 ? "journey" : "journeys"} with upcoming departures
                </p>
              )}

              {/* Ad-hoc trips (no parent journey — e.g. admin-created) don't fit the grouping above. */}
              {shownAdHoc.length > 0 && (
                <div className="mt-6">
                  <h3 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
                    Other upcoming trips
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {shownAdHoc.map((t) => (
                      <Link
                        key={t.id}
                        href={`/operator/trips/${t.id}`}
                        className="card card-hover flex items-center justify-between p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                          <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                            <Users size={13} />
                            {t.bus.bus_type.name} · {t.bus.bus_type.seat_count} seats · Bus {t.bus.reg_no}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                            <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">{t.status}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-400" />
                        </div>
                      </Link>
                    ))}
                    {moreAdHocCount > 0 && (
                      <p className="ui px-1 text-center text-sm text-slate-500 dark:text-zinc-400">
                        +{moreAdHocCount} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        ) : shownTrips.length === 0 ? (
          <div className="card mt-4 p-10 text-center text-slate-500 dark:text-zinc-400">
            No trips yet — you&apos;ll see them here once your operator assigns you to a bus.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {shownTrips.map((t) => (
              <Link
                key={t.id}
                href={`/operator/trips/${t.id}`}
                className="card card-hover flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                  <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                    <Users size={13} />
                    {t.bus.bus_type.name} · {t.bus.bus_type.seat_count} seats · Bus {t.bus.reg_no}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                    <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">{t.status}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </Link>
            ))}
            {moreTripsCount > 0 && (
              <p className="ui px-1 text-center text-sm text-slate-500 dark:text-zinc-400">
                +{moreTripsCount} more upcoming {moreTripsCount === 1 ? "departure" : "departures"}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-5 text-center">
      <div className="font-heading text-xl font-bold text-brand dark:text-blue-400 sm:text-2xl">
        {value}
      </div>
      <div className="ui mt-1 flex items-center justify-center gap-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
        {label}
      </div>
    </div>
  );
}
