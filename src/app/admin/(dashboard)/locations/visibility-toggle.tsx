"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setAdminLocationVisibility, ApiError } from "@/lib/api";

export function VisibilityToggle({ locationId, isPublic }: { locationId: string; isPublic: boolean }) {
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
      await setAdminLocationVisibility(session.access_token, locationId, !isPublic);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update visibility.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`ui flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
          isPublic
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        }`}
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isPublic ? (
          <Eye size={13} />
        ) : (
          <EyeOff size={13} />
        )}
        {isPublic ? "Visible" : "Hidden"}
      </button>
    </div>
  );
}
