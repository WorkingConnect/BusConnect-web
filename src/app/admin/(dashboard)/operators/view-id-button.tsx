"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminIdDocumentUrl, ApiError } from "@/lib/api";

export function ViewIdButton({ operatorId }: { operatorId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setBusy(true);
    // Open the tab synchronously, before any `await` — once we cross an
    // await, the browser no longer treats window.open as tied to this click
    // and silently blocks it as a popup (no error, it just does nothing).
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
      const { url } = await getAdminIdDocumentUrl(session.access_token, operatorId);
      if (tab) {
        tab.location.href = url;
      } else {
        // Tab was blocked outright (e.g. popups disabled entirely) — fall
        // back to navigating the current tab so the action still succeeds.
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      setError(e instanceof ApiError ? e.message : "Could not open document.");
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
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        View ID
      </button>
    </div>
  );
}
