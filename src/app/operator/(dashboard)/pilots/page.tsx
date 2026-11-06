import Link from "next/link";
import { PlusCircle, User, Users, UserCheck, Clock, BusFront } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  listPilots,
  getPilotPhotoUrl,
  getOperatorFleet,
  ApiError,
  type OperatorPilot,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KpiCard, EmptyState } from "../dashboard-ui";
import { AssignFleetButton } from "./assign-fleet-button";

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

export default async function OperatorPilotsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/pilots" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to manage your pilots
      </Link>
    );
  }

  let pilots: OperatorPilot[] = [];
  let busOptions: { id: string; label: string }[] = [];
  let error: string | null = null;
  try {
    const [pilotList, fleet] = await Promise.all([
      listPilots(session.access_token),
      getOperatorFleet(session.access_token),
    ]);
    pilots = pilotList;
    busOptions = fleet.buses
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b.id, label: `${b.reg_no} · ${b.bus_type?.name ?? "—"}` }));
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can manage pilots."
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

  const photoUrls = new Map(
    (
      await Promise.all(
        pilots
          .filter((p) => p.profile_image_url)
          .map(async (p) => {
            try {
              const { url } = await getPilotPhotoUrl(session.access_token, p.id);
              return [p.id, url] as const;
            } catch {
              return [p.id, null] as const;
            }
          }),
      )
    ).filter((entry): entry is [string, string] => !!entry[1]),
  );

  const activeCount = pilots.filter((p) => p.status === "active").length;
  const pendingCount = pilots.filter((p) => p.status === "pending").length;
  const assignedCount = pilots.filter((p) => p.assigned_bus_id).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Pilots</h1>
          <p className="ui mt-1 text-sm text-muted-foreground">
            Drivers and conductors registered to your fleet. They&apos;re active immediately, no approval needed.
          </p>
        </div>
        <Link href="/operator/pilots/register" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Register pilot
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Users size={16} />} label="Total pilots" value={String(pilots.length)} meta="on your roster" />
        <KpiCard icon={<UserCheck size={16} />} label="Active" value={String(activeCount)} meta="ready to work" />
        <KpiCard icon={<Clock size={16} />} label="Pending" value={String(pendingCount)} meta="awaiting approval" />
        <KpiCard icon={<BusFront size={16} />} label="Assigned" value={String(assignedCount)} meta="to a bus" />
      </div>

      <div className="mt-6">
        {pilots.length === 0 ? (
          <EmptyState
            icon={<User size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title="No pilots registered yet"
            subtitle="Register a driver or conductor to start assigning them to your buses."
            action={
              <Link href="/operator/pilots/register" className="btn-primary mt-4">
                <PlusCircle size={16} /> Register pilot
              </Link>
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pilots.map((p) => {
                  const photoUrl = photoUrls.get(p.id) ?? null;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/operator/pilots/${p.id}`} className="flex min-w-0 items-center gap-3">
                          <Avatar size="lg" className="shrink-0 border border-border">
                            <AvatarImage src={photoUrl ?? undefined} alt={`${p.name} photo`} />
                            <AvatarFallback>
                              <User size={16} />
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                            {p.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="ui text-sm text-muted-foreground tabular-nums">{p.phone_no}</TableCell>
                      <TableCell className="ui text-sm">
                        {p.bus ? (
                          <>
                            <span className="capitalize">{p.assigned_role}</span>
                            <span className="block text-xs text-muted-foreground">{p.bus.reg_no}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.user_id ? (
                          <span className="ui text-xs font-medium text-emerald-600 dark:text-emerald-400">Linked</span>
                        ) : (
                          <span className="ui text-xs text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[p.status]}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Link
                            href={`/operator/pilots/${p.id}`}
                            className="ui inline-flex shrink-0 items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            View
                          </Link>
                          <AssignFleetButton
                            pilotId={p.id}
                            busOptions={busOptions}
                            currentBusId={p.assigned_bus_id}
                            currentRole={p.assigned_role}
                            disabled={p.status !== "active" || !p.user_id}
                            disabledReason={
                              p.status !== "active"
                                ? "Only approved pilots can be assigned to a fleet."
                                : !p.user_id
                                  ? "Link this pilot to a BusConnect account first."
                                  : undefined
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
