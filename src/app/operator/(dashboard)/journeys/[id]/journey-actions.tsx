"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setJourneyStatus, deleteJourney, isAdminOperatorContext, ApiError } from "@/lib/api";

export function JourneyActions({
  journeyId,
  status,
}: {
  journeyId: string;
  status: "active" | "paused";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only ConflictException (409) — a real blocking guard — offers the
  // override; a 403/404/etc means something else is wrong and force
  // wouldn't help.
  const [canOverride, setCanOverride] = useState(false);

  async function toggle() {
    setError(null);
    setBusy("status");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setJourneyStatus(session.access_token, journeyId, status === "active" ? "paused" : "active");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the journey.");
    } finally {
      setBusy(null);
    }
  }

  async function del(force: boolean) {
    setError(null);
    setBusy("delete");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await deleteJourney(session.access_token, journeyId, force);
      router.push("/operator/journeys");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the journey.");
      setCanOverride(e instanceof ApiError && e.status === 409 && isAdminOperatorContext());
      setBusy(null);
      if (force) setConfirming(false); // a failed override means something else is wrong — don't loop
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && !canOverride && <span className="ui w-full text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={!!busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy === "status" ? (
          <Loader2 size={13} className="animate-spin" />
        ) : status === "active" ? (
          <Pause size={13} />
        ) : (
          <Play size={13} />
        )}
        {status === "active" ? "Pause" : "Resume"}
      </button>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          <Trash2 size={13} /> Delete
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="ui text-xs text-slate-600 dark:text-zinc-400">Delete this journey?</span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
                setCanOverride(false);
              }}
              disabled={!!busy}
              className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void del(false)}
              disabled={!!busy}
              className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy === "delete" ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirm
            </button>
          </div>

          {canOverride && (
            <div className="ui max-w-sm rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldAlert size={13} /> Admin override
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{error}</p>
              <button
                type="button"
                onClick={() => void del(true)}
                disabled={!!busy}
                className="ui mt-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {busy === "delete" ? <Loader2 size={13} className="animate-spin" /> : "Cancel trips, refund & delete"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
