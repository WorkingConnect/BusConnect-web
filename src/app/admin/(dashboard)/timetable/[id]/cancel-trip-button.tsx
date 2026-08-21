"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelOperatorTrip, clearCancellationRequest, ApiError } from "@/lib/api";

/**
 * Admin-only trip cancellation — an operator can only ever cancel an empty
 * trip themselves (the backend blocks it once bookings exist); once it has
 * bookings they can only *request* a cancellation (see the operator
 * timetable's RequestCancellationButton), which shows up here as a pending
 * request for the admin to approve or reject. Approve just runs the normal
 * force-cancel (this page is always entered in admin context, so the
 * backend gives it full force+refund rights); reject clears the request
 * without touching the trip. Absent a pending request, this still offers a
 * direct cancel — first attempt is plain, a 409 (has bookings) surfaces the
 * same force-confirm.
 */
export function CancelTripButton({
  tripId,
  cancellationRequestedAt,
  cancellationReason,
}: {
  tripId: string;
  cancellationRequestedAt: string | null;
  cancellationReason: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsForce, setNeedsForce] = useState(false);

  async function getToken() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function cancel(force: boolean) {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await cancelOperatorTrip(token, tripId, force);
      router.push("/admin/timetable");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel this trip.");
      setNeedsForce(e instanceof ApiError && e.status === 409);
      setBusy(false);
      if (force) setConfirming(false); // a failed override means something else is wrong — don't loop
    }
  }

  async function reject() {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await clearCancellationRequest(token, tripId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reject this request.");
      setBusy(false);
    }
  }

  if (cancellationRequestedAt) {
    return (
      <div className="ui max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
          <ShieldAlert size={15} /> Operator requested cancellation
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          Requested {new Date(cancellationRequestedAt).toLocaleString("en-LK")}
          {cancellationReason ? ` — "${cancellationReason}"` : ""}
        </p>
        {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void cancel(true)}
            disabled={busy}
            className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Approve & refund all
          </button>
          <button
            type="button"
            onClick={() => void reject()}
            disabled={busy}
            className="ui rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/50"
          >
            Reject request
          </button>
        </div>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={15} /> Cancel trip
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {error && !needsForce && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
        {!error && <span className="ui text-xs text-slate-600 dark:text-zinc-400">Cancel this trip?</span>}
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
            setNeedsForce(false);
          }}
          disabled={busy}
          className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => void cancel(false)}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes
        </button>
      </div>

      {needsForce && (
        <div className="ui max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-right dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldAlert size={13} /> Has bookings
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{error}</p>
          <button
            type="button"
            onClick={() => void cancel(true)}
            disabled={busy}
            className="ui mt-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="mx-auto animate-spin" /> : "Cancel & refund all bookings"}
          </button>
        </div>
      )}
    </div>
  );
}
