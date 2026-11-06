"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteAdminLocation, ApiError } from "@/lib/api";

export function DeleteLocationButton({ locationId, locationName }: { locationId: string; locationName: string }) {
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
      await deleteAdminLocation(session.access_token, locationId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this location.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
      >
        <Trash2 size={13} />
      </button>
    );
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      {error && <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>}
      <span className="ui whitespace-nowrap text-xs text-muted-foreground">
        Permanently delete <strong>{locationName}</strong>?
      </span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="ui shrink-0 whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
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
