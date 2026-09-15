"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Tag, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { applyBookingOffer, removeBookingOffer, ApiError } from "@/lib/api";

export function PromoCodeForm({
  bookingId,
  appliedOffer,
}: {
  bookingId: string;
  /** Set when the booking already has a code applied (booking.offer). */
  appliedOffer?: { title: string; code: string } | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getToken() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new ApiError(401, "Your session expired. Please sign in again.");
    return session.access_token;
  }

  async function apply() {
    if (!code.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      await applyBookingOffer(token, bookingId, code.trim());
      setCode("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not apply that code.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      await removeBookingOffer(token, bookingId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove the code.");
    } finally {
      setBusy(false);
    }
  }

  if (appliedOffer) {
    return (
      <div className="ui flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <Tag size={14} />
          <span className="font-semibold">{appliedOffer.code}</span> applied
        </span>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline disabled:opacity-60 dark:text-emerald-400"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Remove
        </button>
        {error && <p className="ui mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Have a promo code?"
          disabled={busy}
          className="field flex-1 text-sm uppercase placeholder:normal-case"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="btn-secondary shrink-0 px-4 text-sm"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && <p className="ui mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
