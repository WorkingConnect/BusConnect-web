import Link from "next/link";
import { ArrowRight, CalendarClock, PlusCircle, Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listJourneys, ApiError, type OperatorJourney } from "@/lib/api";
import { formatTime, durationLabel } from "@/lib/journey-format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";

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

  const activeCount = journeys.filter((j) => j.status === "active").length;
  const pausedCount = journeys.filter((j) => j.status === "paused").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Journeys</h1>
          <p className="ui mt-1 text-sm text-muted-foreground">
            Your recurring services: a bus + crew running a route on a schedule. Each journey puts
            seats on sale for every date it runs.
          </p>
        </div>
        <Link href="/operator/journeys/new" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Create journey
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <KpiCard icon={<CalendarClock size={16} />} label="Total journeys" value={String(journeys.length)} meta="on your roster" />
        <KpiCard icon={<Play size={16} />} label="Active" value={String(activeCount)} meta="on sale" />
        <KpiCard icon={<Pause size={16} />} label="Paused" value={String(pausedCount)} meta="not scheduling" />
      </div>

      <div className="mt-6">
        {journeys.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title="No journeys yet"
            subtitle="Create one to put a bus on sale."
            action={
              <Link href="/operator/journeys/new" className="btn-primary mt-4">
                <PlusCircle size={16} /> Create journey
              </Link>
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Crew</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journeys.map((j) => (
                  <TableRow key={j.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/operator/journeys/${j.id}`} className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                          {j.route?.name ?? "—"}
                        </span>
                        {j.code && (
                          <span className="ui shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {j.code}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="ui text-sm">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {formatTime(j.depart_time)}
                        <ArrowRight size={12} className="text-muted-foreground" />
                        {formatTime(j.arrive_time)}
                        {j.arrive_day_offset > 0 && (
                          <span className="ui rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                            +1 day
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {durationLabel(j.depart_time, j.arrive_time, j.arrive_day_offset)}
                      </span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {j.bus?.reg_no ?? "—"}
                      <span className="block text-xs capitalize">
                        {j.bus?.bus_type?.class ? j.bus.bus_type.class.replace(/_/g, " ") : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {j.driver || j.conductor ? [j.driver?.name, j.conductor?.name].filter(Boolean).join(" · ") : "—"}
                    </TableCell>
                    <TableCell className="ui text-sm tabular-nums text-muted-foreground">
                      LKR {Number(j.base_fare).toLocaleString("en-LK")}
                    </TableCell>
                    <TableCell>
                      <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[j.status]}`}>
                        {j.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/operator/journeys/${j.id}`}
                        className="ui inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
