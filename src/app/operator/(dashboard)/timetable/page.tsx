import Link from "next/link";
import { CalendarRange, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  listOperatorTrips,
  listJourneys,
  ApiError,
  type OperatorTrip,
  type OperatorJourney,
} from "@/lib/api";
import { ScheduleForm } from "./schedule-form";
import { RequestCancellationButton } from "./request-cancellation-button";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  boarding: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  departed: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function colomboDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}
function prettyDate(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function colomboTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" });
}

export default async function TimetablePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/timetable" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to manage your timetable
      </Link>
    );
  }

  let trips: OperatorTrip[] = [];
  let journeys: OperatorJourney[] = [];
  let error: string | null = null;
  try {
    [trips, journeys] = await Promise.all([
      listOperatorTrips(session.access_token),
      listJourneys(session.access_token),
    ]);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can manage the timetable."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  // Upcoming trips only, grouped by service date.
  const now = Date.now();
  const upcoming = trips
    .filter((t) => new Date(t.depart_at).getTime() > now && t.status !== "cancelled")
    .sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());

  const byDate = new Map<string, OperatorTrip[]>();
  for (const t of upcoming) {
    const key = colomboDateKey(t.depart_at);
    const bucket = byDate.get(key);
    if (bucket) bucket.push(t);
    else byDate.set(key, [t]);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Timetable</h1>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Schedule dated trips from your journeys. Each trip you add goes on sale to passengers immediately.
        </p>
      </div>

      <div className="mt-6">
        <ScheduleForm journeys={journeys} />
      </div>

      <div className="mt-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <CalendarRange size={18} />
        </span>
        <h2 className="font-heading text-xl font-semibold">Upcoming trips</h2>
      </div>

      {byDate.size === 0 ? (
        <div className="card mt-5 p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
          No upcoming trips scheduled. Add some above.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {[...byDate.entries()].map(([date, dayTrips]) => (
            <div key={date}>
              <p className="ui mb-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">
                {prettyDate(date)}
              </p>
              <div className="flex flex-col gap-2">
                {dayTrips.map((t) => (
                  <div key={t.id} className="card flex items-center justify-between gap-3 p-4">
                    <Link href={`/operator/trips/${t.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                        <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[t.status] ?? STATUS_STYLE.scheduled}`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400">
                        <Users size={13} />
                        {t.bus.bus_type.name} · {t.bus.bus_type.seat_count} seats · Bus {t.bus.reg_no}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-heading font-bold text-brand dark:text-blue-400">
                        {colomboTime(t.depart_at)}
                      </span>
                      <RequestCancellationButton
                        tripId={t.id}
                        cancellationRequestedAt={t.cancellation_requested_at}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
