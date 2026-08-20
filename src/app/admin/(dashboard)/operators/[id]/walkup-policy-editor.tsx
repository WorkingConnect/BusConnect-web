"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setOperatorWalkupPolicy, ApiError } from "@/lib/api";

export function WalkupPolicyEditor({
  operatorId,
  initialEnabled,
  initialLimit,
}: {
  operatorId: string;
  initialEnabled: boolean;
  initialLimit: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [limit, setLimit] = useState(initialLimit === null ? "" : String(initialLimit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    let walkupLimit: number | null = null;
    if (limit.trim() !== "") {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 0) {
        setError("Enter a whole number of 0 or more, or leave blank for unlimited.");
        return;
      }
      walkupLimit = n;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await setOperatorWalkupPolicy(session.access_token, operatorId, { walkupEnabled: enabled, walkupLimit });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the walk-up policy.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <span className="font-heading text-lg font-bold text-brand dark:text-blue-400">
          {initialEnabled ? (initialLimit === null ? "Unlimited" : `Up to ${initialLimit} per trip`) : "Turned off"}
        </span>
        <button
          type="button"
          onClick={() => {
            setEnabled(initialEnabled);
            setLimit(initialLimit === null ? "" : String(initialLimit));
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`ui rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            enabled
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {enabled ? "Walk-ups allowed" : "Walk-ups turned off"}
        </button>
        <div className="relative w-32">
          <input
            type="number"
            min={0}
            step="1"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            disabled={!enabled}
            placeholder="Unlimited"
            className="field py-2 text-sm disabled:opacity-50"
          />
        </div>
        <span className="ui text-xs text-slate-500 dark:text-zinc-500">max per trip</span>
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
