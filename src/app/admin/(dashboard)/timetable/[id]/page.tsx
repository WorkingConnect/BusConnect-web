import Link from "next/link";
import { ArrowLeft, Wallet, Armchair, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorManifest, ApiError, type OperatorManifest } from "@/lib/api";
import { ManifestPanel } from "@/app/operator/(dashboard)/trips/[id]/manifest-panel";
import { CancelTripButton } from "./cancel-trip-button";
import { PayoutActions } from "./payout-actions";

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Admin's own trip-detail workspace — reuses the exact same manifest panel
// and seat map an operator owner sees (block/unblock seats, assign & check
// in walk-up passengers, view every passenger's boarding/drop and fare),
// entered only via admin/trip-enter (see that route for why: it sets the
// admin_operator_id cookie that getOperatorManifest's request() attaches as
// X-Admin-Operator-Id, which is what grants owner-level access here).
export default async function AdminTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link
        href={`/login?next=/admin/timetable/${id}`}
        className="font-medium text-brand underline dark:text-blue-400"
      >
        Sign in to view this trip
      </Link>
    );
  }

  let manifest: OperatorManifest | null = null;
  let error: string | null = null;
  try {
    manifest = await getOperatorManifest(session.access_token, id);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Open this trip from the Timetable list to view its details."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !manifest) {
    return (
      <div>
        <Link
          href="/admin/timetable"
          className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft size={15} /> Back to timetable
        </Link>
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Trip not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/timetable"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to timetable
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {manifest.route_name ?? "Trip manifest"}
          </h1>
          <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {dateTime(manifest.depart_at)} · Bus {manifest.bus?.reg_no ?? "—"}
          </p>
        </div>
        {(manifest.status === "scheduled" || manifest.status === "boarding") && (
          <CancelTripButton
            tripId={id}
            cancellationRequestedAt={manifest.cancellation_requested_at}
            cancellationReason={manifest.cancellation_reason}
          />
        )}
        {(manifest.status === "arrived" || manifest.status === "cancelled") && <PayoutActions tripId={id} />}
      </div>

      {/* stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <UserCheck size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Boarded</p>
            <p className="font-heading text-xl font-bold">
              {manifest.boarded_count}
              <span className="text-slate-400"> / {manifest.confirmed_count}</span>
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <Armchair size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Seats booked</p>
            <p className="font-heading text-xl font-bold">{manifest.taken.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <Wallet size={18} />
          </span>
          <div>
            <p className="ui text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Revenue</p>
            <p className="font-heading text-xl font-bold text-brand dark:text-blue-400">
              LKR {Number(manifest.revenue).toLocaleString("en-LK")}
            </p>
          </div>
        </div>
      </div>

      <ManifestPanel manifest={manifest} isPilot={false} />
    </div>
  );
}
