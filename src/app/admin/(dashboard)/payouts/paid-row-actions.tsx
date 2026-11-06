"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Trash2, Undo2 } from "lucide-react";
import { getAdminPayoutSlipUrl, reopenPayout, deleteSettledTrip, ApiError } from "@/lib/api";

type Confirming = "reopen" | "delete" | null;

export function PaidRowActions({
  token,
  tripId,
  reference,
  onChange,
}: {
  token: string;
  tripId: string;
  reference: string | null;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);

  async function viewSlip() {
    setError(null);
    setBusy("slip");
    // Open the tab synchronously, before any `await` — once we cross an
    // await, the browser no longer treats window.open as tied to this click
    // and silently blocks it as a popup (no error, it just does nothing).
    const tab = window.open("", "_blank");
    try {
      const { url } = await getAdminPayoutSlipUrl(token, tripId);
      if (tab) {
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      tab?.close();
      setError(e instanceof ApiError ? e.message : "Could not open the slip.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadSlip() {
    setError(null);
    setBusy("download");
    try {
      const { url } = await getAdminPayoutSlipUrl(token, tripId);
      // Fetch as a blob rather than just pointing an <a download> at the
      // signed URL — a cross-origin href's `download` attribute is ignored
      // by most browsers, so this is what actually guarantees a save
      // instead of a plain navigation.
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `payout-slip-${tripId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not download the slip.");
    } finally {
      setBusy(null);
    }
  }

  async function reopen() {
    setError(null);
    setBusy("reopen");
    try {
      await reopenPayout(token, tripId);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reopen.");
      setBusy(null);
      setConfirming(null);
    }
  }

  async function deleteTrip() {
    setError(null);
    setBusy("delete");
    try {
      await deleteSettledTrip(token, tripId);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this trip.");
      setBusy(null);
      setConfirming(null);
    }
  }

  if (confirming) {
    const isDelete = confirming === "delete";
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className="ui whitespace-nowrap text-xs text-muted-foreground">
            {isDelete ? "Delete this trip for good?" : "Reopen this payout?"}
          </span>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={!!busy}
            className="ui rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            onClick={isDelete ? deleteTrip : reopen}
            disabled={!!busy}
            className={`ui inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
              isDelete ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {busy === confirming ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isDelete ? (
              <Trash2 size={12} />
            ) : (
              <Undo2 size={12} />
            )}
            {isDelete ? "Delete" : "Reopen"}
          </button>
        </div>
        {error && <span className="ui text-[11px] text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span className="ui rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          Paid
        </span>
        <button
          type="button"
          onClick={viewSlip}
          disabled={!!busy}
          className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          {busy === "slip" ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} View slip
        </button>
        <button
          type="button"
          onClick={downloadSlip}
          disabled={!!busy}
          className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          {busy === "download" ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        </button>
        <button
          type="button"
          onClick={() => setConfirming("reopen")}
          aria-label="Reopen payout"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => setConfirming("delete")}
          aria-label="Delete trip"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {reference && <span className="ui text-[11px] text-muted-foreground">Ref: {reference}</span>}
      {error && <span className="ui text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
