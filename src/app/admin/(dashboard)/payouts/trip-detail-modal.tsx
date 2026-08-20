"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { getAdminPayout, ApiError, type AdminPayoutDetail } from "@/lib/api";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const BOOKING_STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function TripDetailModal({ token, tripId, onClose }: { token: string; tripId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminPayoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminPayout(token, tripId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load this trip."));
  }, [token, tripId]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="card-lg max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight">Trip details</h2>
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

        {error ? (
          <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !detail ? (
          <div className="mt-6 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900">
              <Row label="Bus" value={`${detail.bus?.reg_no ?? "—"} · ${detail.bus?.bus_type?.name ?? "—"}`} />
              <Row label="Departs" value={dateTime(detail.depart_at)} />
              <Row label="Status" value={detail.status} />
              <Row label="Seats sold" value={`${detail.seats_sold} / ${detail.bus?.bus_type?.seat_count ?? "—"}`} />
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-zinc-900">
              <Row label={`Gross fares (${detail.seats_sold} seat${detail.seats_sold === 1 ? "" : "s"})`} value={money(detail.gross)} />
              <Row label={`Commission (${detail.commission_pct}%)`} value={`− ${money(detail.commission_amount)}`} muted />
              <div className="my-2 border-t border-slate-200 dark:border-zinc-800" />
              <Row label="Net" value={money(detail.net_amount)} bold />
              {detail.payout && (
                <>
                  <div className="my-2 border-t border-slate-200 dark:border-zinc-800" />
                  <Row label="Paid" value={dateTime(detail.payout.paid_at)} />
                  {detail.payout.reference && <Row label="Reference" value={detail.payout.reference} />}
                </>
              )}
            </div>

            {detail.walkup_count > 0 && (
              <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-zinc-900">
                <Row
                  label={`Walk-in cash (${detail.walkup_count} seat${detail.walkup_count === 1 ? "" : "s"})`}
                  value={money(detail.walkup_gross)}
                  muted
                />
                <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">
                  Collected directly by the operator — not part of the payout above.
                </p>
              </div>
            )}

            <p className="ui mt-4 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              Bookings ({detail.bookings.length})
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {detail.bookings.length === 0 ? (
                <p className="ui text-sm text-slate-400 dark:text-zinc-500">No bookings on this trip.</p>
              ) : (
                detail.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <span className="ui font-medium">{b.seats.join(", ")}</span>
                      <span
                        className={`ui ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_STYLE[b.status] ?? ""}`}
                      >
                        {b.status}
                      </span>
                      <p className="ui text-xs text-slate-400 dark:text-zinc-500">{dateTime(b.created_at)}</p>
                    </div>
                    <span className="ui shrink-0 font-medium text-slate-700 dark:text-zinc-300">{money(b.amount)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
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
