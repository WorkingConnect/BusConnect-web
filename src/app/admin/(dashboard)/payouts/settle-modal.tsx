"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Landmark, Loader2, Upload, X } from "lucide-react";
import { getAdminPayout, settlePayout, ApiError, type AdminPayoutDetail } from "@/lib/api";
import { uploadPayoutSlip } from "@/lib/storage";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SettleModal({
  token,
  tripId,
  onClose,
  onSettled,
}: {
  token: string;
  tripId: string;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [detail, setDetail] = useState<AdminPayoutDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminPayout(token, tripId)
      .then(setDetail)
      .catch((e) => setLoadErr(e instanceof ApiError ? e.message : "Could not load the payout."));
  }, [token, tripId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slip) return setError("Upload the transfer slip to close this payout.");
    setBusy(true);
    try {
      const slipPath = await uploadPayoutSlip(tripId, slip);
      await settlePayout(token, tripId, { slipPath, reference: reference || undefined });
      onSettled();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not settle the payout. Try again.");
      setBusy(false);
    }
  }

  const bank = detail?.bus?.operator?.payout_account;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card-lg max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight">Settle payout</h2>
            <p className="ui text-sm text-slate-500 dark:text-zinc-400">
              {detail?.route?.name ?? "…"} · {detail?.bus?.operator?.name ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        {loadErr ? (
          <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{loadErr}</p>
        ) : !detail ? (
          <div className="mt-6 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4">
            {/* Money breakdown */}
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900">
              <Row label={`Gross fares (${detail.seats_sold} seat${detail.seats_sold === 1 ? "" : "s"})`} value={money(detail.gross)} />
              <Row label={`Commission (${detail.commission_pct}%)`} value={`− ${money(detail.commission_amount)}`} muted />
              <div className="my-2 border-t border-slate-200 dark:border-zinc-800" />
              <Row label="Net payable to operator" value={money(detail.net_amount)} bold />
            </div>

            {/* Bank account */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
              <Landmark size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="ui text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                  Operator bank account
                </p>
                {bank ? (
                  <p className="mt-0.5 text-slate-700 dark:text-zinc-300">
                    {bank.bankName ?? "—"} · {bank.branchName ?? "—"}
                    <br />
                    A/C {bank.accountNumber ?? "—"}
                  </p>
                ) : (
                  <p className="mt-0.5 text-amber-600 dark:text-amber-400">
                    No bank details on file. Ask the operator to add them in their profile.
                  </p>
                )}
              </div>
            </div>

            {/* Reference + slip */}
            <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Bank reference <span className="font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. transfer / cheque no."
                className="field text-sm"
              />
            </label>

            <div className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
              Transfer slip
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-brand hover:text-brand dark:border-zinc-700 dark:text-zinc-400">
                <Upload size={15} />
                {slip ? slip.name : "Choose an image or PDF…"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>

            {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? "Settling…" : `Mark paid · ${money(detail.net_amount)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="ui flex items-center justify-between py-0.5 text-sm">
      <span className={muted ? "text-slate-400 dark:text-zinc-500" : "text-slate-600 dark:text-zinc-400"}>{label}</span>
      <span className={bold ? "font-heading font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-zinc-300"}>
        {value}
      </span>
    </div>
  );
}
