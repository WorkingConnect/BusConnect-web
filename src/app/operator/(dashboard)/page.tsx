import Link from "next/link";
import {
  Building2,
  Users,
  PlusCircle,
  ChevronRight,
  Clock,
  Ban,
  Bus as BusIcon,
  ScanLine,
  CalendarRange,
  CalendarClock,
  Ticket,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Route as RouteIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOperator,
  listOperatorTrips,
  getOperatorAnalytics,
  listJourneys,
  getMyAssignment,
  getOperatorFleet,
  listPilots,
  getOperatorRevenue,
  ApiError,
  type OperatorMembership,
  type OperatorTrip,
  type OperatorAnalytics,
  type OperatorJourney,
  type MyAssignment,
  type OperatorFleet,
  type OperatorPilot,
  type OperatorRevenue,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/status-chip";
import { KpiCard, EmptyState } from "./dashboard-ui";

const COLOMBO = "Asia/Colombo";

function dayKey(d: Date) {
  // Stable YYYY-MM-DD in Colombo time (Sri Lanka has no DST, fixed +5:30).
  return new Intl.DateTimeFormat("en-CA", { timeZone: COLOMBO }).format(d);
}

/** "Today 06:30" / "Tomorrow 20:00" / "12 Nov · 13:30" split into parts. */
function departureLabel(iso: string) {
  const d = new Date(iso);
  const key = dayKey(d);
  const todayKey = dayKey(new Date());
  const tomorrowKey = dayKey(new Date(Date.now() + 86_400_000));
  const time = d.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: COLOMBO,
  });
  const rel =
    key === todayKey
      ? "Today"
      : key === tomorrowKey
        ? "Tomorrow"
        : d.toLocaleDateString("en-LK", { day: "numeric", month: "short", timeZone: COLOMBO });
  return { rel, time };
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: COLOMBO }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Top routes by all-time net revenue, from the operator's settled/earned rows. */
function topRoutes(revenue: OperatorRevenue | null, limit = 5) {
  const byRoute = new Map<string, { name: string; net: number }>();
  for (const r of revenue?.rows ?? []) {
    const key = r.route?.id ?? r.route?.name ?? "—";
    const prev = byRoute.get(key) ?? { name: r.route?.name ?? "—", net: 0 };
    prev.net += Number(r.net_amount ?? 0);
    byRoute.set(key, prev);
  }
  return [...byRoute.values()]
    .filter((r) => r.net > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);
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
        <p className="mt-4 font-heading font-semibold">{operator.name}: application under review</p>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          BusConnect is reviewing your application. You&apos;ll be able to run journeys once approved.
        </p>
      </div>
    );
  }

  if (operator.status === "suspended") {
    return (
      <div className="card border border-red-200 p-10 text-center dark:border-red-900/50">
        <Ban size={32} className="mx-auto text-red-500" />
        <p className="mt-4 font-heading font-semibold">{operator.name}: account suspended</p>
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
  let fleet: OperatorFleet | null = null;
  let pilots: OperatorPilot[] = [];
  let revenue: OperatorRevenue | null = null;
  try {
    if (role === "owner") {
      // Fleet / pilots / revenue power the dashboard widgets; a failure there
      // falls back to null/[] rather than blanking the whole page.
      [trips, analytics, journeys, fleet, pilots, revenue] = await Promise.all([
        listOperatorTrips(session.access_token),
        getOperatorAnalytics(session.access_token),
        listJourneys(session.access_token),
        getOperatorFleet(session.access_token).catch(() => null),
        listPilots(session.access_token).catch(() => [] as OperatorPilot[]),
        getOperatorRevenue(session.access_token).catch(() => null),
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
  const journeyById = new Map(journeys.map((j) => [j.id, j] as const));

  const DEPARTURES_SHOWN = 8;
  const shownDepartures = upcomingTrips.slice(0, DEPARTURES_SHOWN);
  const moreDeparturesCount = upcomingTrips.length - shownDepartures.length;

  // Owner widgets -----------------------------------------------------------
  const routes = role === "owner" ? topRoutes(revenue) : [];
  const routesMax = Math.max(1, ...routes.map((r) => r.net));
  const busesActive = fleet?.buses.filter((b) => b.status === "active").length ?? 0;
  const busesPending = fleet?.buses.filter((b) => b.status === "pending").length ?? 0;
  const busesRejected = fleet?.buses.filter((b) => b.status === "rejected").length ?? 0;
  const busesTotal = fleet?.buses.length ?? 0;
  const pilotsActive = pilots.filter((p) => p.status === "active").length;
  const pilotsPending = pilots.filter((p) => p.status === "pending").length;
  const cancellationRequests = upcomingTrips.filter((t) => t.cancellation_requested_at).length;

  const headerSubtitle =
    role === "owner"
      ? "Here's your operational overview for today."
      : "Here are the trips you can board today.";

  // Fleet donut segments (circumference for r=46).
  const C = 2 * Math.PI * 46;
  let acc = 0;
  const donutSegments = [
    { cls: "stroke-emerald-500", n: busesActive },
    { cls: "stroke-amber-500", n: busesPending },
    { cls: "stroke-red-500", n: busesRejected },
  ]
    .filter((s) => s.n > 0)
    .map((s) => {
      const f = s.n / Math.max(1, busesTotal);
      const seg = { cls: s.cls, dash: `${f * C} ${C - f * C}`, offset: -acc * C };
      acc += f;
      return seg;
    });

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {operator.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={operator.logo_url}
              alt={`${operator.name} logo`}
              className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-zinc-800"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
              <BusIcon size={24} />
            </div>
          )}
          <div>
            <h1 className="font-heading text-[28px] font-bold leading-tight tracking-tight">
              {greeting()}, {operator.name}
            </h1>
            <p className="ui mt-1 text-sm text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
        {role === "owner" ? (
          <Link href="/operator/timetable" className="btn-primary shrink-0">
            <CalendarRange size={16} /> Manage timetable
          </Link>
        ) : (
          <Link href="/operator/scan" className="btn-primary shrink-0">
            <ScanLine size={16} /> Scan tickets
          </Link>
        )}
      </div>

      {/* ── Conductor/driver: your assigned bus ─────────────────────────── */}
      {role === "pilot" && (
        <section className="mt-8">
          <h2 className="font-heading mb-3 text-lg font-bold tracking-tight">Your assignment</h2>
          {assignment?.bus ? (
            <Card>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                      <BusIcon size={20} />
                    </div>
                    <div>
                      <p className="font-heading text-lg font-bold tracking-tight">{assignment.bus.reg_no}</p>
                      <p className="ui mt-0.5 text-sm text-muted-foreground">
                        {assignment.bus.bus_type?.name ?? "—"} · {assignment.bus.bus_type?.seat_count ?? "—"} seats
                      </p>
                    </div>
                  </div>
                  {assignment.pilot?.assigned_role && <span className="pill">{assignment.pilot.assigned_role}</span>}
                </div>
                {assignment.bus.amenities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {assignment.bus.amenities.map((a) => (
                      <span
                        key={a}
                        className="ui rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                You&apos;re not assigned to a bus yet. Your operator will assign you to one, and your trips
                will show up here.
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ── Owner: KPI strip ────────────────────────────────────────────── */}
      {role === "owner" && (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard icon={<CalendarClock size={16} />} label="Active journeys" value={String(activeJourneyCount)} meta={`of ${journeys.length} total`} />
          <KpiCard icon={<CalendarRange size={16} />} label="Upcoming trips" value={String(analytics?.upcomingTrips ?? 0)} meta="scheduled ahead" />
          <KpiCard icon={<Ticket size={16} />} label="Bookings" value={Number(analytics?.totalBookings ?? 0).toLocaleString("en-LK")} meta="all time" />
          <KpiCard icon={<Users size={16} />} label="Passengers" value={Number(analytics?.totalPassengers ?? 0).toLocaleString("en-LK")} meta="all time" />
          <KpiCard feature icon={<Wallet size={16} />} label="Net earned" value={`LKR ${Number(analytics?.totalNetRevenue ?? 0).toLocaleString("en-LK")}`} meta="after commission" />
        </div>
      )}

      {/* ── Owner: top routes + fleet status ────────────────────────────── */}
      {role === "owner" && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Top routes by revenue</CardTitle>
                <p className="ui mt-0.5 text-sm text-muted-foreground">Net earned, all time</p>
              </div>
              <Link href="/operator/revenue" className="ui text-sm font-medium text-brand hover:underline dark:text-blue-400">
                View revenue
              </Link>
            </CardHeader>
            <CardContent>
              {routes.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center text-center">
                  <RouteIcon size={26} className="text-slate-400 dark:text-zinc-600" />
                  <p className="ui mt-3 text-sm text-muted-foreground">
                    No revenue recorded yet. Completed trips will rank here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {routes.map((r, i) => (
                    <li key={r.name}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="ui flex min-w-0 items-center gap-2 text-sm font-medium">
                          <span className="ui w-4 shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                            {i + 1}
                          </span>
                          <span className="truncate font-heading font-semibold">{r.name}</span>
                        </span>
                        <span className="ui shrink-0 text-sm font-semibold tabular-nums">
                          LKR {Math.round(r.net).toLocaleString("en-LK")}
                        </span>
                      </div>
                      <div className="ml-6 h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand dark:bg-blue-500"
                          style={{ width: `${Math.max(4, (r.net / routesMax) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Fleet status</CardTitle>
              <Link href="/operator/fleet" className="ui text-sm font-medium text-brand hover:underline dark:text-blue-400">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-1">
              {busesTotal === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <BusIcon size={26} className="text-slate-400 dark:text-zinc-600" />
                  <p className="ui mt-3 text-sm text-muted-foreground">No buses registered yet.</p>
                  <Link href="/operator/fleet/register" className="btn-secondary mt-4 text-sm">
                    <PlusCircle size={15} /> Register a bus
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-5">
                    <div className="relative h-28 w-28 shrink-0">
                      <svg viewBox="0 0 112 112" className="h-28 w-28 -rotate-90">
                        <circle cx="56" cy="56" r="46" fill="none" strokeWidth="13" className="stroke-border" />
                        {donutSegments.map((s, i) => (
                          <circle
                            key={i}
                            cx="56"
                            cy="56"
                            r="46"
                            fill="none"
                            strokeWidth="13"
                            className={s.cls}
                            strokeDasharray={s.dash}
                            strokeDashoffset={s.offset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 grid place-items-center text-center">
                        <div>
                          <span className="font-heading block text-2xl font-bold leading-none tabular-nums">
                            {busesTotal}
                          </span>
                          <span className="ui text-[11px] text-muted-foreground">
                            {busesTotal === 1 ? "bus" : "buses"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ul className="ui flex-1 space-y-2 text-sm">
                      <FleetRow color="bg-emerald-500" label="In service" count={busesActive} />
                      <FleetRow color="bg-amber-500" label="Pending" count={busesPending} />
                      {busesRejected > 0 && <FleetRow color="bg-red-500" label="Rejected" count={busesRejected} />}
                    </ul>
                  </div>
                  <div className="ui mt-auto flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users size={15} /> Crew
                    </span>
                    <span className="font-semibold tabular-nums">{pilotsActive} active</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Owner: needs attention ──────────────────────────────────────── */}
      {role === "owner" && (busesPending > 0 || pilotsPending > 0 || cancellationRequests > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="ui flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle size={16} /> Needs attention
          </span>
          {busesPending > 0 && (
            <AttentionChip href="/operator/fleet" label={`${busesPending} bus${busesPending > 1 ? "es" : ""} awaiting approval`} />
          )}
          {pilotsPending > 0 && (
            <AttentionChip href="/operator/pilots" label={`${pilotsPending} pilot${pilotsPending > 1 ? "s" : ""} awaiting approval`} />
          )}
          {cancellationRequests > 0 && (
            <AttentionChip href="/operator/timetable" label={`${cancellationRequests} cancellation request${cancellationRequests > 1 ? "s" : ""}`} />
          )}
        </div>
      )}

      {/* ── Upcoming departures ─────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            {role === "owner" ? "Upcoming departures" : "Trips you can board"}
          </h2>
          {role === "owner" && journeys.length > 0 && (
            <Link href="/operator/journeys" className="ui text-sm font-medium text-brand hover:underline dark:text-blue-400">
              All journeys
            </Link>
          )}
        </div>

        {shownDepartures.length === 0 ? (
          role === "owner" ? (
            <EmptyState
              icon={<CalendarRange size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
              title="No upcoming departures"
              subtitle={
                journeys.length === 0
                  ? "Create a journey, then schedule its dates from the Timetable."
                  : "Schedule some dates for your journeys from the Timetable."
              }
              action={
                journeys.length === 0 ? (
                  <Link href="/operator/journeys/new" className="btn-primary mt-4">
                    <PlusCircle size={16} /> Create your first journey
                  </Link>
                ) : (
                  <Link href="/operator/timetable" className="btn-primary mt-4">
                    <PlusCircle size={16} /> Schedule trips
                  </Link>
                )
              }
            />
          ) : (
            <EmptyState
              icon={<BusIcon size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
              title="No trips yet"
              subtitle="You'll see them here once your operator assigns you to a bus."
            />
          )
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Bus</TableHead>
                  {role === "owner" && <TableHead>Crew</TableHead>}
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shownDepartures.map((t) => {
                  const dep = departureLabel(t.depart_at);
                  const driver = t.journey_id ? journeyById.get(t.journey_id)?.driver?.name : null;
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/operator/trips/${t.id}`} className="font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                          {t.route?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{dep.rel}</span>
                        <span className="ui block text-xs text-muted-foreground tabular-nums">{dep.time}</span>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">{t.bus.reg_no}</span>
                        <span className="ui block text-xs text-muted-foreground">{t.bus.bus_type.name}</span>
                      </TableCell>
                      {role === "owner" && (
                        <TableCell className="ui text-sm text-muted-foreground">{driver ?? "—"}</TableCell>
                      )}
                      <TableCell className="ui text-sm text-muted-foreground tabular-nums">
                        {t.bus.bus_type.seat_count} seats
                      </TableCell>
                      <TableCell>
                        <StatusChip status={t.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/operator/trips/${t.id}`}
                          className="ui inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline dark:text-blue-400"
                        >
                          Manage <ChevronRight size={14} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        {moreDeparturesCount > 0 && (
          <p className="ui mt-2 px-1 text-center text-sm text-muted-foreground">
            +{moreDeparturesCount} more upcoming {moreDeparturesCount === 1 ? "departure" : "departures"}
          </p>
        )}
      </section>
    </div>
  );
}

function FleetRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{count}</span>
    </li>
  );
}

function AttentionChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="ui inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-card px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/40"
    >
      {label} <ArrowRight size={12} />
    </Link>
  );
}

