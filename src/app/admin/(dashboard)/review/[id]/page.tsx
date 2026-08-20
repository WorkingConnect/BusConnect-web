import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminJourney, ApiError, type AdminJourneyDetail } from "@/lib/api";
import { ReviewStatusActions } from "../review-status-actions";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatTime(hhmmss: string) {
  return hhmmss.slice(0, 5);
}

export default async function AdminReviewDetailPage({
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
      <Link href={`/login?next=/admin/review/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this journey
      </Link>
    );
  }

  let journey: AdminJourneyDetail | null = null;
  let error: string | null = null;
  try {
    journey = await getAdminJourney(session.access_token, id);
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

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/review"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to review
      </Link>

      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight">{journey.route?.name ?? "—"}</h1>
            <span
              className={`ui mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[journey.review_status]}`}
            >
              {journey.review_status}
            </span>
          </div>
          <ReviewStatusActions journeyId={journey.id} reviewStatus={journey.review_status} />
        </div>

        <dl className="ui mt-6 grid grid-cols-1 gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Operator</p>
            <p className="mt-0.5 text-sm font-medium">{journey.operator?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Journey code</p>
            <p className="mt-0.5 text-sm font-medium">{journey.code ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Bus</p>
            <p className="mt-0.5 text-sm font-medium">
              {journey.bus?.reg_no ?? "—"} — {journey.bus?.bus_type?.name ?? "—"} (
              {journey.bus?.bus_type?.seat_count ?? "—"} seats)
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Base fare</p>
            <p className="mt-0.5 text-sm font-medium">LKR {Number(journey.base_fare).toLocaleString("en-LK")}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Crew</p>
            <p className="mt-0.5 text-sm font-medium">
              Driver: {journey.driver?.name ?? "—"} · Conductor: {journey.conductor?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Schedule</p>
            <p className="mt-0.5 text-sm font-medium">
              Departs {formatTime(journey.depart_time)} → Arrives {formatTime(journey.arrive_time)}
              {journey.arrive_day_offset > 0 && " (+1 day)"}
            </p>
          </div>
          {(journey.depart_location || journey.arrive_location) && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-500">Boarding / drop-off points</p>
              <p className="mt-0.5 text-sm font-medium">
                {journey.depart_location ?? "—"} → {journey.arrive_location ?? "—"}
              </p>
            </div>
          )}
        </dl>
      </div>

      <div className="card-lg mt-6 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Stop timetable
        </h2>
        <div className="mt-4 flex flex-col gap-2">
          {journey.stops.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400">No stops set.</p>
          ) : (
            journey.stops.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0 last:pb-0 dark:border-zinc-800"
              >
                <span className="font-medium">{s.route_stop?.location?.name_en ?? "—"}</span>
                <span className="ui text-slate-500 dark:text-zinc-400">
                  {formatTime(s.scheduled_time)}
                  {s.day_offset > 0 && " (+1)"} ·{" "}
                  {s.can_board && s.can_drop ? "Board & drop" : s.can_board ? "Board only" : "Drop only"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
