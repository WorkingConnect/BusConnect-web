"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAdminPayouts, ApiError, type AdminPayoutRow } from "@/lib/api";
import { SettleModal } from "./settle-modal";
import { PaidRowActions } from "./paid-row-actions";
import { TripDetailModal } from "./trip-detail-modal";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPayoutsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settleTrip, setSettleTrip] = useState<AdminPayoutRow | null>(null);
  const [viewTripId, setViewTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setToken(session.access_token);
      setRows(await listAdminPayouts(session.access_token));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 403
            ? "Your account does not have admin access."
            : e.message
          : "Could not reach BusConnect-api. Is it running?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading payouts…
      </div>
    );
  }
  if (error || !token) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  // Three mutually exclusive buckets, same split as operator Revenue:
  // arrived-and-unpaid, not-yet-arrived (still provisional), already paid.
  const ready = rows.filter((r) => r.settleable);
  const locked = rows.filter((r) => r.status !== "arrived" && r.status !== "cancelled" && r.payout_status !== "paid");
  const paid = rows.filter((r) => r.payout_status === "paid");

  const readyTotal = ready.reduce((s, r) => s + r.net_amount, 0);
  const lockedTotal = locked.reduce((s, r) => s + r.net_amount, 0);
  const paidTotal = paid.reduce((s, r) => s + r.net_amount, 0);

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <HandCoins size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Settle each arrived trip with the operator that ran it.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Ready payouts" value={money(readyTotal)} accent />
        <Stat label="Locked payouts" value={money(lockedTotal)} />
        <Stat label="Paid out" value={money(paidTotal)} />
      </div>

      <PayoutSection
        title="Ready payouts"
        subtitle="Arrived trips awaiting settlement."
        rows={ready}
        emptyMessage="No trips awaiting settlement."
        token={token}
        onView={setViewTripId}
        onSettle={setSettleTrip}
        onChange={load}
      />
      <PayoutSection
        title="Locked payouts"
        subtitle="Upcoming or in-progress trips — revenue is still provisional until the trip arrives."
        rows={locked}
        emptyMessage="No upcoming or in-progress trips."
        token={token}
        onView={setViewTripId}
        onSettle={setSettleTrip}
        onChange={load}
      />
      <PayoutSection
        title="Paid out"
        subtitle="Already settled."
        rows={paid}
        emptyMessage="Nothing settled yet."
        token={token}
        onView={setViewTripId}
        onSettle={setSettleTrip}
        onChange={load}
      />

      {settleTrip && (
        <SettleModal
          token={token}
          tripId={settleTrip.id}
          onClose={() => setSettleTrip(null)}
          onSettled={() => {
            setSettleTrip(null);
            void load();
          }}
        />
      )}

      {viewTripId && <TripDetailModal token={token} tripId={viewTripId} onClose={() => setViewTripId(null)} />}
    </div>
  );
}

function PayoutSection({
  title,
  subtitle,
  rows,
  emptyMessage,
  token,
  onView,
  onSettle,
  onChange,
}: {
  title: string;
  subtitle: string;
  rows: AdminPayoutRow[];
  emptyMessage: string;
  token: string;
  onView: (tripId: string) => void;
  onSettle: (row: AdminPayoutRow) => void;
  onChange: () => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-lg font-semibold">
        {title} <span className="ui text-sm font-normal text-slate-400 dark:text-zinc-500">({rows.length})</span>
      </h2>
      <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">{subtitle}</p>

      <div className="mt-3 flex flex-col gap-2">
        {rows.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500 dark:text-zinc-400">{emptyMessage}</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</p>
                  <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                    {r.bus?.operator?.name ?? "—"} · Bus {r.bus?.reg_no ?? "—"} · {dateTime(r.depart_at)}
                  </p>
                  <p className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
                    {r.seats_sold} seat{r.seats_sold === 1 ? "" : "s"} · {r.booking_count} booking
                    {r.booking_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="ui text-xs text-slate-400 dark:text-zinc-500">
                      {money(r.gross)} − {money(r.commission_amount)} ({r.commission_pct}%)
                    </p>
                    <p className="font-heading text-lg font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onView(r.id)}
                    className="ui shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    View
                  </button>
                  {r.payout_status === "paid" ? (
                    <PaidRowActions token={token} tripId={r.id} reference={r.reference} onChange={onChange} />
                  ) : r.settleable ? (
                    <button type="button" onClick={() => onSettle(r)} className="btn-primary shrink-0 py-2">
                      Settle
                    </button>
                  ) : (
                    <span className="ui shrink-0 whitespace-nowrap text-xs text-slate-400 dark:text-zinc-500">
                      Departs {dateTime(r.depart_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-4 text-center">
      <div className={`font-heading text-lg font-bold ${accent ? "text-emerald-600 dark:text-emerald-400" : "text-brand dark:text-blue-400"}`}>
        {value}
      </div>
      <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">{label}</div>
    </div>
  );
}
