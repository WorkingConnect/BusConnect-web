import Link from "next/link";
import { Bus as BusIcon, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorFleet, ApiError, type OperatorFleet } from "@/lib/api";

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

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">My fleet</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Buses registered to your account. New buses stay pending until BusConnect approves them.
          </p>
        </div>
        <Link href="/operator/fleet/register" className="btn-primary shrink-0">
          <PlusCircle size={16} /> Register a bus
        </Link>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <BusIcon size={18} className="text-brand dark:text-blue-400" />
          <h2 className="font-heading text-lg font-semibold">Buses ({fleet.buses.length})</h2>
        </div>
        {fleet.buses.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
            No buses registered yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {fleet.buses.map((b) => (
              <Link key={b.id} href={`/operator/fleet/${b.id}`} className="card card-hover flex items-start gap-3 p-4">
                {b.front_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.front_image_url}
                    alt={`${b.reg_no} front`}
                    className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div className="h-14 w-20 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{b.reg_no}</p>
                    <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <p className="ui mt-0.5 text-sm text-slate-600 dark:text-zinc-400">
                    {b.bus_type?.name ?? "—"} · {b.bus_type?.seat_count ?? "—"} seats
                    {b.amenities.length > 0 && <> · {b.amenities.length} amenities</>}
                  </p>
                  {(b.crew.driver || b.crew.conductor) && (
                    <p className="ui mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                      {b.crew.driver && <span>Driver · {b.crew.driver.name}</span>}
                      {b.crew.conductor && <span>Conductor · {b.crew.conductor.name}</span>}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
