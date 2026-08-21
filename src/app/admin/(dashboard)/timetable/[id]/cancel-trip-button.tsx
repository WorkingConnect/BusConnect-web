"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelOperatorTrip, ApiError } from "@/lib/api";

/**
 * Admin-only trip cancellation — the operator-side "Cancel trip" buttons
 * (web timetable, pilot trip screen) were removed in favor of this: an
 * operator could otherwise only cancel an empty trip anyway (the backend
 * blocks it once bookings exist), so a real cancel-with-bookings is now
 * exclusively an admin action from here, which the backend gives full
 * force+refund rights to since this page is always entered in admin
 * context (see admin/trip-enter). First attempt is a plain cancel; if the
 * trip has bookings the backend 409s with a refund-queue confirmation,
 * which this shows before retrying with force=true.
 */
export function CancelTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsForce, setNeedsForce] = useState(false);

  async function cancel(force: boolean) {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await cancelOperatorTrip(session.access_token, tripId, force);
      router.push("/admin/timetable");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel this trip.");
      setNeedsForce(e instanceof ApiError && e.status === 409);
      setBusy(false);
      if (force) setConfirming(false); // a failed override means something else is wrong — don't loop
    }
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
