import Link from "next/link";
import { Bus as BusIcon, PlusCircle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorFleet, ApiError, type OperatorFleet } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

export default async function OperatorFleetPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/fleet" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view your fleet
      </Link>
    );
  }

  let fleet: OperatorFleet | null = null;
  let error: string | null = null;
  try {
    fleet = await getOperatorFleet(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account isn't linked to a bus operator."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !fleet) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  const activeCount = fleet.buses.filter((b) => b.status === "active").length;
  const pendingCount = fleet.buses.filter((b) => b.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">My fleet</h1>
          <p className="ui mt-1 text-sm text-muted-foreground">
            Buses registered to your account. New buses stay pending until BusConnect approves them.
          </p>
        </div>
        <Link href="/operator/fleet/register" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Register a bus
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <KpiCard icon={<BusIcon size={16} />} label="Total buses" value={String(fleet.buses.length)} meta="in your fleet" />
        <KpiCard icon={<CheckCircle2 size={16} />} label="Active" value={String(activeCount)} meta="schedulable" />
        <KpiCard icon={<Clock size={16} />} label="Pending" value={String(pendingCount)} meta="awaiting approval" />
      </div>

      <div className="mt-6">
        {fleet.buses.length === 0 ? (
          <EmptyState
            icon={<BusIcon size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title="No buses registered yet"
            subtitle="Register your first bus to start scheduling journeys."
            action={
              <Link href="/operator/fleet/register" className="btn-primary mt-4">
                <PlusCircle size={16} /> Register a bus
              </Link>
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bus</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Crew</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleet.buses.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/operator/fleet/${b.id}`} className="flex min-w-0 items-center gap-3">
                        {b.front_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.front_image_url}
                            alt={`${b.reg_no} front`}
                            className="h-10 w-14 shrink-0 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                            <BusIcon size={14} />
                          </div>
                        )}
                        <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                          {b.reg_no}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="ui text-sm">
                      {b.bus_type?.name ?? "—"}
                      <span className="block text-xs capitalize text-muted-foreground">
                        {b.bus_type?.class.replace("_", " ") ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="ui text-sm tabular-nums text-muted-foreground">
                      {b.bus_type?.seat_count ?? "—"}
                    </TableCell>
                    <TableCell className="ui text-sm">
                      {b.crew.driver || b.crew.conductor ? (
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {b.crew.driver && <span>Driver · {b.crew.driver.name}</span>}
                          {b.crew.conductor && <span>Conductor · {b.crew.conductor.name}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[b.status]}`}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/operator/fleet/${b.id}`}
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
