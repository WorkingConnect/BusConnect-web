"use client";

import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminPilotPhotoUrl, ApiError } from "@/lib/api";

export function ViewPhotoButton({ pilotId }: { pilotId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setBusy(true);
    // Open the tab synchronously, before any `await` — once we cross an
    // await, the browser no longer treats window.open as tied to this click
    // and silently blocks it as a popup.
    const tab = window.open("", "_blank");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        tab?.close();
        return;
      }
      const { url } = await getAdminPilotPhotoUrl(session.access_token, pilotId);
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      setError(e instanceof ApiError ? e.message : "Could not open photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
        View photo
      </button>
    </div>
  );
}
