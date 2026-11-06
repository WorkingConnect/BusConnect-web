import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminJourney, ApiError, type AdminJourneyDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewStatusActions } from "../review-status-actions";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatTime(hhmmss: string) {
  return hhmmss.slice(0, 5);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="break-words text-right font-medium">{value || "—"}</dd>
    </div>
  );
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
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to review
      </Link>

      <Card className="mt-4">
        <CardContent className="pt-6">
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

          <dl className="mt-4 divide-y divide-border border-t border-border">
            <Row label="Operator" value={journey.operator?.name} />
            <Row label="Journey code" value={journey.code} />
            <Row
              label="Bus"
              value={
                journey.bus
                  ? `${journey.bus.reg_no} — ${journey.bus.bus_type?.name ?? "—"} (${journey.bus.bus_type?.seat_count ?? "—"} seats)`
                  : null
              }
            />
            <Row label="Base fare" value={`LKR ${Number(journey.base_fare).toLocaleString("en-LK")}`} />
            <Row
              label="Crew"
              value={`Driver: ${journey.driver?.name ?? "—"} · Conductor: ${journey.conductor?.name ?? "—"}`}
            />
            <Row
              label="Schedule"
              value={`${formatTime(journey.depart_time)} → ${formatTime(journey.arrive_time)}${
                journey.arrive_day_offset > 0 ? " (+1 day)" : ""
              }`}
            />
            {(journey.depart_location || journey.arrive_location) && (
              <Row
                label="Boarding / drop-off points"
                value={`${journey.depart_location ?? "—"} → ${journey.arrive_location ?? "—"}`}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Stop timetable</CardTitle>
        </CardHeader>
        <CardContent>
          {journey.stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stops set.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {journey.stops.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0 last:pb-0"
                >
                  <span className="font-medium">{s.route_stop?.location?.name_en ?? "—"}</span>
                  <span className="ui text-muted-foreground">
                    {formatTime(s.scheduled_time)}
                    {s.day_offset > 0 && " (+1)"} ·{" "}
                    {s.can_board && s.can_drop ? "Board & drop" : s.can_board ? "Board only" : "Drop only"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
