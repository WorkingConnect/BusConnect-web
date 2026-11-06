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
            <p className="ui text-sm text-muted-foreground">
              {detail?.route?.name ?? "…"} · {detail?.bus?.operator?.name ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : !detail ? (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-xl bg-muted p-4">
              <Row label="Bus" value={`${detail.bus?.reg_no ?? "—"} · ${detail.bus?.bus_type?.name ?? "—"}`} />
              <Row label="Departs" value={dateTime(detail.depart_at)} />
              <Row label="Status" value={detail.status} />
              <Row label="Seats sold" value={`${detail.seats_sold} / ${detail.bus?.bus_type?.seat_count ?? "—"}`} />
            </div>

            <div className="mt-3 rounded-xl bg-muted p-4">
              <Row label={`Gross fares (${detail.seats_sold} seat${detail.seats_sold === 1 ? "" : "s"})`} value={money(detail.gross)} />
              <Row label={`Commission (${detail.commission_pct}%)`} value={`− ${money(detail.commission_amount)}`} muted />
              <div className="my-2 border-t border-border" />
              <Row label="Net" value={money(detail.net_amount)} bold />
              {detail.payout && (
                <>
                  <div className="my-2 border-t border-border" />
                  <Row label="Paid" value={dateTime(detail.payout.paid_at)} />
                  {detail.payout.reference && <Row label="Reference" value={detail.payout.reference} />}
                </>
              )}
            </div>

            {detail.walkup_count > 0 && (
              <div className="mt-3 rounded-xl bg-muted p-4">
                <Row
                  label={`Walk-in cash (${detail.walkup_count} seat${detail.walkup_count === 1 ? "" : "s"})`}
                  value={money(detail.walkup_gross)}
                  muted
                />
                <p className="ui mt-1 text-xs text-muted-foreground">
                  Collected directly by the operator. Not part of the payout above.
                </p>
              </div>
            )}

            <p className="ui mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bookings ({detail.bookings.length})
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {detail.bookings.length === 0 ? (
                <p className="ui text-sm text-muted-foreground">No bookings on this trip.</p>
              ) : (
                detail.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="ui font-medium">{b.seats.join(", ")}</span>
                      <span
                        className={`ui ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_STYLE[b.status] ?? ""}`}
                      >
                        {b.status}
                      </span>
                      <p className="ui text-xs text-muted-foreground">{dateTime(b.created_at)}</p>
                    </div>
                    <span className="ui shrink-0 font-medium text-foreground">{money(b.amount)}</span>
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
      <span className={muted ? "text-muted-foreground/70" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-heading font-bold text-foreground" : "font-medium text-foreground"}>
        {value}
      </span>
    </div>
  );
}
