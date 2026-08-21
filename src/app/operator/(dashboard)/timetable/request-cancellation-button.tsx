"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelOperatorTrip, requestTripCancellation, clearCancellationRequest, ApiError } from "@/lib/api";

/**
 * Operator-side trip cancellation. An empty trip can still be removed
 * outright (first attempt, plain DELETE); once it has bookings the backend
 * 409s and this falls back to *requesting* a cancellation instead — an
 * admin then approves (force-cancels with a full refund queue) or rejects
 * it from /admin/timetable/[id]. If a request is already pending, this
 * just shows that state with a withdraw option.
 */
export function RequestCancellationButton({
  tripId,
  cancellationRequestedAt,
  variant = "compact",
}: {
  tripId: string;
  cancellationRequestedAt: string | null;
  /** "compact" (icon-only) fits a tight timetable list row; "full" (a
   *  labeled red button, matching the admin trip page's Cancel button)
   *  suits the trip-detail page header. */
  variant?: "compact" | "full";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRequest, setNeedsRequest] = useState(false);

  async function getToken() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function tryCancel() {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await cancelOperatorTrip(token, tripId, false);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setNeedsRequest(true);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not cancel this trip.");
      }
      setBusy(false);
    }
  }

  async function sendRequest() {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await requestTripCancellation(token, tripId);
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send the cancellation request.");
      setBusy(false);
    }
  }

  async function withdraw() {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      await clearCancellationRequest(token, tripId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not withdraw the request.");
      setBusy(false);
    }
  }

  if (cancellationRequestedAt) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="ui rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          Cancellation requested
        </span>
        {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
        <button
          type="button"
          onClick={() => void withdraw()}
          disabled={busy}
          className="ui text-xs font-medium text-slate-500 underline transition-colors hover:text-slate-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
        >
          {busy ? "Withdrawing…" : "Withdraw request"}
        </button>
      </div>
    );
  }

  if (!confirming) {
    return variant === "full" ? (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={15} /> Cancel trip
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Cancel trip"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {error && !needsRequest && (
          <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
        {!error && <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Cancel?</span>}
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
            setNeedsRequest(false);
          }}
          disabled={busy}
          className="ui rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => void tryCancel()}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Yes
        </button>
      </div>

      {needsRequest && (
        <div className="ui max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-2 text-right dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <ShieldAlert size={13} /> Has bookings
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            This trip has passengers, so it can only be cancelled with admin approval.
          </p>
          <button
            type="button"
            onClick={() => void sendRequest()}
            disabled={busy}
            className="ui mt-1.5 rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="mx-auto animate-spin" /> : "Request cancellation"}
          </button>
        </div>
      )}
    </div>
  );
}
