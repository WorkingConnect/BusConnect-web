"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelOperatorTrip, isAdminOperatorContext, ApiError } from "@/lib/api";

export function CancelTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only ConflictException (409) — a real blocking guard — offers the
  // override; a 403/404/etc means something else is wrong and force
  // wouldn't help.
  const [canOverride, setCanOverride] = useState(false);

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
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove the trip.");
      setCanOverride(e instanceof ApiError && e.status === 409 && isAdminOperatorContext());
      setBusy(false);
      if (force) setConfirming(false); // a failed override means something else is wrong — don't loop
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Remove trip"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {error && !canOverride && (
          <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
        {!error && <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Remove?</span>}
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
            setCanOverride(false);
          }}
          disabled={busy}
          className="ui rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => void cancel(false)}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes
        </button>
      </div>

      {canOverride && (
        <div className="ui max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-2 text-right dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldAlert size={13} /> Admin override
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{error}</p>
          <button
            type="button"
            onClick={() => void cancel(true)}
            disabled={busy}
            className="ui mt-1.5 rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="mx-auto animate-spin" /> : "Force delete anyway"}
          </button>
        </div>
      )}
    </div>
  );
}
