import Link from "next/link";
import { PlusCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  listPilots,
  getPilotPhotoUrl,
  getOperatorFleet,
  ApiError,
  type OperatorPilot,
} from "@/lib/api";
import { AssignFleetButton } from "./assign-fleet-button";
import { DeletePilotButton } from "./delete-pilot-button";

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

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Pilots</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Drivers and conductors registered to your fleet. New registrations stay pending until
            BusConnect approves them.
          </p>
        </div>
        <Link href="/operator/pilots/register" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Register pilot
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {pilots.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No pilots registered yet.
          </div>
        ) : (
          pilots.map((p) => {
            const photoUrl = photoUrls.get(p.id) ?? null;
            return (
              <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/operator/pilots/${p.id}`} className="flex min-w-0 items-center gap-3">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={`${p.name} photo`}
                      className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                      <User size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="ui mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[p.status]}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <span>{p.phone_no}</span>
                      {p.bus && (
                        <span className="capitalize">
                          {p.assigned_role} · {p.bus.reg_no}
                        </span>
                      )}
                      {p.user_id && <span className="text-emerald-600 dark:text-emerald-400">Account linked</span>}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Link
                    href={`/operator/pilots/${p.id}`}
                    className="ui inline-flex shrink-0 items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                  <DeletePilotButton pilotId={p.id} pilotName={p.name} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
