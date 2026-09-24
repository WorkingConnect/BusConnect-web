import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronRight, PlusCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listJourneys, ApiError, type OperatorJourney } from "@/lib/api";
import { formatTime, durationLabel } from "@/lib/journey-format";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default async function OperatorJourneysPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/journeys" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to manage your journeys
      </Link>
    );
  }

  let journeys: OperatorJourney[] = [];
  let error: string | null = null;
  try {
    journeys = await listJourneys(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can manage journeys."
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Journeys</h1>
          <p className="ui mt-2 text-sm font-medium text-slate-600 dark:text-zinc-300">
            Your recurring services: a bus + crew running a route on a schedule. Each journey puts
            seats on sale for every date it runs.
          </p>
        </div>
        <Link href="/operator/journeys/new" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Create journey
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {journeys.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            <CalendarClock size={28} className="mx-auto mb-3 text-slate-300 dark:text-zinc-700" />
            No journeys yet. Create one to put a bus on sale.
          </div>
        ) : (
          journeys.map((j) => (
            <Link
              key={j.id}
              href={`/operator/journeys/${j.id}`}
              className="card card-hover flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-heading font-semibold">{j.route?.name ?? "—"}</p>
                  {j.code && (
                    <span className="ui rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {j.code}
                    </span>
                  )}
                  <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[j.status]}`}>
                    {j.status}
                  </span>
                </div>
                <p className="ui mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-zinc-400">
                  <span className="font-medium text-slate-900 dark:text-white">{formatTime(j.depart_time)}</span>
                  <ArrowRight size={13} className="text-slate-400" />
                  <span className="font-medium text-slate-900 dark:text-white">{formatTime(j.arrive_time)}</span>
                  {j.arrive_day_offset > 0 && (
                    <span className="ui rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      +1 day
                    </span>
                  )}
                  <span className="text-slate-400">·</span>
                  <span>{durationLabel(j.depart_time, j.arrive_time, j.arrive_day_offset)}</span>
                </p>
                <p className="ui mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
                  <span>
                    {j.bus?.reg_no ?? "—"} · {j.bus?.bus_type?.name ?? "—"}
                  </span>
                  {(j.driver || j.conductor) && (
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {[j.driver?.name, j.conductor?.name].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  <span>LKR {Number(j.base_fare).toLocaleString("en-LK")}</span>
                </p>
              </div>
              <ChevronRight size={16} className="hidden shrink-0 text-slate-400 sm:block" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
