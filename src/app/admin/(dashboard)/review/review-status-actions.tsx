"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAdminJourneyReviewStatus, ApiError } from "@/lib/api";

export function ReviewStatusActions({ journeyId, reviewStatus }: { journeyId: string; reviewStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "approved" | "rejected") {
    setError(null);
    setBusy(next);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setAdminJourneyReviewStatus(session.access_token, journeyId, next);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update review status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
      {reviewStatus !== "approved" && (
        <button
          type="button"
          onClick={() => setStatus("approved")}
          disabled={!!busy}
          className="ui rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "approved" ? <Loader2 size={13} className="animate-spin" /> : "Approve"}
        </button>
      )}
      {reviewStatus !== "rejected" && (
        <button
          type="button"
          onClick={() => setStatus("rejected")}
          disabled={!!busy}
          className="ui rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {busy === "rejected" ? <Loader2 size={13} className="animate-spin" /> : "Reject"}
        </button>
      )}
    </div>
  );
}
