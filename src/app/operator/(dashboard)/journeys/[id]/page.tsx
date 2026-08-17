import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bus, CalendarClock, ChevronRight, MapPin, Pencil, User, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJourney, listOperatorTrips, ApiError, type OperatorJourneyDetail, type OperatorTrip } from "@/lib/api";
import { formatTime, durationLabel } from "@/lib/journey-format";
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
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
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
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to journeys
      </Link>

      {/* Header */}
      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-bold tracking-tight">{journey.route?.name ?? "—"}</h1>
              {journey.code && (
                <span className="ui rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {journey.code}
                </span>
              )}
              <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[journey.status]}`}>
                {journey.status}
              </span>
            </div>
            <p className="ui mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-zinc-400">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{formatTime(journey.depart_time)}</span>
              <ArrowRight size={15} className="text-slate-400" />
              <span className="text-lg font-bold text-slate-900 dark:text-white">{formatTime(journey.arrive_time)}</span>
              {journey.arrive_day_offset > 0 && (
                <span className="ui rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  +1 day
                </span>
              )}
              <span className="text-slate-400">·</span>
              <span>{durationLabel(journey.depart_time, journey.arrive_time, journey.arrive_day_offset)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/operator/journeys/${journey.id}/edit`}
              className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Pencil size={13} /> Edit details
            </Link>
            <JourneyActions journeyId={journey.id} status={journey.status} />
          </div>
        </div>

        <dl className="ui mt-6 grid grid-cols-1 gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
          <Field icon={Bus} label="Bus" value={`${journey.bus?.reg_no ?? "—"} · ${journey.bus?.bus_type?.name ?? "—"}`} />
          <Field icon={Wallet} label="Base fare" value={`LKR ${Number(journey.base_fare).toLocaleString("en-LK")}`} />
          <Field
            icon={User}
            label="Driver"
            value={journey.driver?.name ?? <span className="text-slate-400 dark:text-zinc-500">Not assigned</span>}
          />
          <Field
            icon={User}
            label="Conductor"
            value={journey.conductor?.name ?? <span className="text-slate-400 dark:text-zinc-500">Not assigned</span>}
          />
        </dl>

        {(journey.depart_location || journey.arrive_location) && (
          <div className="mt-5 grid grid-cols-1 gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-zinc-800">
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
      <div className="card-lg mt-4 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <CalendarClock size={15} />
          </span>
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Upcoming departures
          </h2>
        </div>

        {upcomingDepartures.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
            No upcoming departures — schedule some dates for this journey from the Timetable.
          </div>
        ) : (
          <div className="mt-3 flex flex-col">
            {upcomingDepartures.map((t) => (
              <Link
                key={t.id}
                href={`/operator/trips/${t.id}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 hover:opacity-80 dark:border-zinc-800/60"
              >
                <p className="font-medium">{formatDateTime(t.depart_at)}</p>
                <div className="flex items-center gap-2">
                  <span className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">{t.status}</span>
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationValue({ name, url }: { name: string | null; url: string | null }) {
  if (!name) return <span className="text-slate-400 dark:text-zinc-500">—</span>;
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
    <div className="card-lg p-5">
      <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">{title}</h2>
      {points.length === 0 ? (
        <p className="ui mt-3 text-sm text-slate-500 dark:text-zinc-500">None.</p>
      ) : (
        <div className="mt-3 flex flex-col">
          {points.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-zinc-800/60">
              <span className="truncate text-sm font-medium">{s.route_stop?.location?.name_en ?? "—"}</span>
              <span className="ui shrink-0 text-sm text-slate-500 dark:text-zinc-400">{formatTime(s.scheduled_time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
