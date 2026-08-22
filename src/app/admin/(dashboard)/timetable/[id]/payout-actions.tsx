"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HandCoins, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminPayout, deleteSettledTrip, ApiError } from "@/lib/api";

/**
 * Shown on a Completed (arrived) or Cancelled trip's detail page — the two
 * states deleteSettledTrip actually allows erasing (see its gate:
 * eligible = a payouts row already exists, OR the trip has zero confirmed
 * revenue to protect). Mirrors the same eligibility check here so the UI
 * doesn't offer a delete that the backend would just reject, or a "Settle
 * payout" link for a trip that never had any revenue to settle.
 */
export function PayoutActions({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const payout = await getAdminPayout(session.access_token, tripId);
        if (!cancelled) setEligible(!!payout.payout || payout.gross <= 0);
      } catch {
        // Best-effort — if this fails just show nothing rather than
        // blocking the rest of the trip-detail page.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function deleteTrip() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await deleteSettledTrip(session.access_token, tripId);
      router.push("/admin/timetable");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this trip.");
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!eligible) {
    return (
      <a
        href={`/admin/payouts?tripId=${tripId}`}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg transition-colors hover:opacity-90"
      >
        <HandCoins size={15} /> Settle payout
      </a>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={15} /> Delete trip record
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
        {!error && (
          <span className="ui text-xs text-slate-600 dark:text-zinc-400">Delete this trip for good?</span>
        )}
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => void deleteTrip()}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
        </button>
      </div>
    </div>
  );
}
