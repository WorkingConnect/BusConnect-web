"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, CreditCard, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { processAdminRefund, ApiError } from "@/lib/api";

// Label + icon reflect what actually happens server-side (admin.service.ts
// processRefund): a real MPGS gateway refund, a real wallet credit, or (no
// paid payment on record — legacy/unknown) just marking it processed.
const METHOD_META: Record<string, { label: string; icon: typeof Check }> = {
  mpgs: { label: "Refund via MPGS", icon: CreditCard },
  wallet: { label: "Credit wallet", icon: Wallet },
};

export function ProcessButton({
  refundId,
  refundMethod,
}: {
  refundId: string;
  refundMethod: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = (refundMethod && METHOD_META[refundMethod]) || { label: "Mark processed", icon: Check };
  const Icon = meta.icon;

  async function process() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await processAdminRefund(session.access_token, refundId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not process this refund.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={process}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
        {meta.label}
      </button>
      {error && <p className="ui mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
