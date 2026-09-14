"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteAdminUser, ApiError } from "@/lib/api";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await deleteAdminUser(session.access_token, userId);
      router.push("/admin/users");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this account.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={13} /> Delete account
      </button>
    );
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {error && <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>}
      <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">
        Permanently delete <strong>{userName}</strong>?
      </span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="ui shrink-0 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={confirmDelete}
        disabled={busy}
        className="ui inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        Confirm delete
      </button>
    </div>
  );
}
