"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteAdminRefund, ApiError } from "@/lib/api";

export function DeleteRefundButton({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await deleteAdminRefund(session.access_token, refundId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this refund.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Delete refund record"
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
      >
        <Trash2 size={14} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
        {!error && <span className="ui text-xs text-slate-600 dark:text-zinc-400">Delete permanently?</span>}
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="ui rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => void del()}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
        </button>
      </div>
    </div>
  );
}
