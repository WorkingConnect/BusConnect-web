import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bus, CalendarClock, ChevronRight, MapPin, Pencil, User, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJourney, listOperatorTrips, ApiError, type OperatorJourneyDetail, type OperatorTrip } from "@/lib/api";
import { formatTime, durationLabel } from "@/lib/journey-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JourneyActions } from "./journey-actions";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="ui text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/operator/journeys/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this journey
      </Link>
    );
  }

  let journey: OperatorJourneyDetail | null = null;
  let trips: OperatorTrip[] = [];
  let error: string | null = null;
  try {
    [journey, trips] = await Promise.all([
      getJourney(session.access_token, id),
      listOperatorTrips(session.access_token),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (!journey) notFound();

  const boarding = journey.stops.filter((s) => s.can_board);
  const dropoff = [...journey.stops.filter((s) => s.can_drop)].reverse();

  const now = Date.now();
  const upcomingDepartures = trips
    .filter((t) => t.journey_id === id && new Date(t.depart_at).getTime() > now && t.status !== "cancelled")
    .sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/operator/journeys"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to journeys
      </Link>

      {/* Header */}
      <div className="card-lg mt-5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight">{journey.route?.name ?? "—"}</h1>
              {journey.code && (
                <span className="ui rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {journey.code}
                </span>
              )}
              <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[journey.status]}`}>
                {journey.status}
              </span>
            </div>
            <p className="ui mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted-foreground">
              <span className="text-lg font-bold text-foreground">{formatTime(journey.depart_time)}</span>
              <ArrowRight size={15} className="text-muted-foreground" />
              <span className="text-lg font-bold text-foreground">{formatTime(journey.arrive_time)}</span>
              {journey.arrive_day_offset > 0 && (
                <span className="ui rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  +1 day
                </span>
              )}
              <span>·</span>
              <span>{durationLabel(journey.depart_time, journey.arrive_time, journey.arrive_day_offset)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/operator/journeys/${journey.id}/edit`}
              className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Pencil size={13} /> Edit details
            </Link>
            <JourneyActions journeyId={journey.id} status={journey.status} />
          </div>
        </div>

        <dl className="ui mt-6 grid grid-cols-1 gap-5 border-t border-border pt-6 sm:grid-cols-2">
          <Field icon={Bus} label="Bus" value={`${journey.bus?.reg_no ?? "—"} · ${journey.bus?.bus_type?.name ?? "—"}`} />
          <Field icon={Wallet} label="Base fare" value={`LKR ${Number(journey.base_fare).toLocaleString("en-LK")}`} />
          <Field
            icon={User}
            label="Driver"
            value={journey.driver?.name ?? <span className="text-muted-foreground">Not assigned</span>}
          />
          <Field
            icon={User}
            label="Conductor"
            value={journey.conductor?.name ?? <span className="text-muted-foreground">Not assigned</span>}
          />
        </dl>

        {(journey.depart_location || journey.arrive_location) && (
          <div className="mt-5 grid grid-cols-1 gap-5 border-t border-border pt-5 sm:grid-cols-2">
            <Field
              icon={MapPin}
              label="Departure point"
              value={
                <LocationValue name={journey.depart_location} url={journey.depart_location_url} />
              }
            />
            <Field
              icon={MapPin}
              label="Arrival point"
              value={<LocationValue name={journey.arrive_location} url={journey.arrive_location_url} />}
            />
          </div>
        )}
      </div>

      {/* Boarding & drop-off timetable */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PointsTable title="Boarding points" points={boarding} />
        <PointsTable title="Drop-off points" points={dropoff} />
      </div>

      {/* Upcoming departures scheduled for this journey */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
              <CalendarClock size={15} />
            </span>
            Upcoming departures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingDepartures.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No upcoming departures. Schedule some dates for this journey from the Timetable.
            </div>
          ) : (
            <div className="flex flex-col">
              {upcomingDepartures.map((t) => (
                <Link
                  key={t.id}
                  href={`/operator/trips/${t.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 hover:opacity-80"
                >
                  <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                  <div className="flex items-center gap-2">
                    <span className="ui text-xs capitalize text-muted-foreground">{t.status}</span>
                    <ChevronRight size={15} className="text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LocationValue({ name, url }: { name: string | null; url: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  if (!url) return <>{name}</>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand underline dark:text-blue-400">
      {name}
    </a>
  );
}

function PointsTable({
  title,
  points,
}: {
  title: string;
  points: OperatorJourneyDetail["stops"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="ui text-sm text-muted-foreground">None.</p>
        ) : (
          <div className="flex flex-col">
            {points.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                <span className="truncate text-sm font-medium">{s.route_stop?.location?.name_en ?? "—"}</span>
                <span className="ui shrink-0 text-sm text-muted-foreground">{formatTime(s.scheduled_time)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
