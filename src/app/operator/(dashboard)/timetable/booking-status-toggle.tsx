"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setTripBookingStatus, ApiError } from "@/lib/api";

/**
 * Owner/pilot/admin-context: stop or resume new bookings on a trip,
 * independent of status — a conductor might close it early because the bus
 * is full, well before boarding starts. Also flips to closed automatically
 * the moment a trip starts boarding (server-side, see setTripStatus) — this
 * button still works afterwards to reopen it if that was a mistake.
 */
export function BookingStatusToggle({
  tripId,
  bookingClosed,
}: {
  tripId: string;
  bookingClosed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setTripBookingStatus(session.access_token, tripId, !bookingClosed);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update booking status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={[
          "ui inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
          bookingClosed
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800",
        ].join(" ")}
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : bookingClosed ? (
          <LockOpen size={15} />
        ) : (
          <Lock size={15} />
        )}
        {bookingClosed ? "Resume booking" : "Stop booking"}
      </button>
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
