import Link from "next/link";
import { ArrowLeft, Wallet, Armchair, UserCheck, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorManifest, ApiError, type OperatorManifest } from "@/lib/api";
import { ManifestPanel } from "./manifest-panel";
import { RequestCancellationButton } from "../../timetable/request-cancellation-button";

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function OperatorManifestPage({
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
      <Link href={`/login?next=/operator/trips/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this manifest
      </Link>
    );
  }

  let manifest: OperatorManifest | null = null;
  let error: string | null = null;
  try {
    manifest = await getOperatorManifest(session.access_token, id);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !manifest) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Manifest not found."}
      </p>
    );
  }

  const isPilot = manifest.role === "pilot";

  return (
    <div>
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to dashboard
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
        <div className="flex shrink-0 items-center gap-2">
          {!isPilot && (manifest.status === "scheduled" || manifest.status === "boarding") && (
            <RequestCancellationButton
              tripId={manifest.trip_id}
              cancellationRequestedAt={manifest.cancellation_requested_at}
              variant="full"
            />
          )}
          <Link href="/operator/scan" className="btn-primary shrink-0">
            <ScanLine size={16} /> Scan tickets
          </Link>
        </div>
      </div>

      {/* stat tiles */}
      <div className={`mt-6 grid gap-3 ${isPilot ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
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
        {!isPilot && (
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
        )}
      </div>

      <ManifestPanel manifest={manifest} isPilot={isPilot} />
    </div>
  );
}
