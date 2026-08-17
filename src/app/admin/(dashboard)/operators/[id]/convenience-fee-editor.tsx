"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setOperatorConvenienceFee, ApiError } from "@/lib/api";

export function ConvenienceFeeEditor({
  operatorId,
  initialPct,
}: {
  operatorId: string;
  initialPct: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(initialPct));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const pct = Number(value);
    // 0 is a valid rate (no fee) — only reject NaN or out-of-range.
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setError("Enter a percentage between 0 and 100.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setOperatorConvenienceFee(session.access_token, operatorId, pct);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the convenience fee.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <span className="font-heading text-2xl font-bold text-brand dark:text-blue-400">{initialPct}%</span>
        <button
          type="button"
          onClick={() => {
            setValue(String(initialPct));
            setError(null);
            setEditing(true);
          }}
          className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Pencil size={13} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <div className="relative w-28">
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field py-2 pr-7 text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">%</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="ui inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-2 text-xs font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={busy}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60 dark:hover:bg-zinc-800"
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </div>
      {error && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
