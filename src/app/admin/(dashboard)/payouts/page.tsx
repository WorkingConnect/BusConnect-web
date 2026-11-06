"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Clock, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAdminPayouts, ApiError, type AdminPayoutRow } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";
import { SettleModal } from "./settle-modal";
import { PaidRowActions } from "./paid-row-actions";
import { TripDetailModal } from "./trip-detail-modal";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Bucket = "ready" | "locked" | "paid";

export default function AdminPayoutsPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settleTrip, setSettleTrip] = useState<AdminPayoutRow | null>(null);
  const [viewTripId, setViewTripId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Bucket>("ready");
  // Deep-linked from a trip's own detail page (Timetable's Completed
  // section) via ?tripId= — auto-opens Settle once that trip's row has
  // loaded, instead of making the admin hunt for it in the list.
  const deepLinkTripId = searchParams.get("tripId");

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

  // Only ever auto-open once — otherwise closing the modal without settling
  // (or settling it) would reopen it the moment anything else reloads
  // `rows` while ?tripId= is still sitting in the URL.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkTripId || rows.length === 0) return;
    const row = rows.find((r) => r.id === deepLinkTripId);
    if (row?.settleable) {
      deepLinkHandled.current = true;
      setSettleTrip(row);
      setSelected("ready");
    }
  }, [rows, deepLinkTripId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
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

  const sections: Record<Bucket, { title: string; subtitle: string; rows: AdminPayoutRow[]; emptyMessage: string }> = {
    ready: {
      title: "Ready payouts",
      subtitle: "Arrived trips awaiting settlement.",
      rows: ready,
      emptyMessage: "No trips awaiting settlement.",
    },
    locked: {
      title: "Locked payouts",
      subtitle: "Upcoming or in-progress trips. Revenue is still provisional until the trip arrives.",
      rows: locked,
      emptyMessage: "No upcoming or in-progress trips.",
    },
    paid: {
      title: "Paid out",
      subtitle: "Already settled.",
      rows: paid,
      emptyMessage: "Nothing settled yet.",
    },
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Payouts</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">Settle each arrived trip with the operator that ran it.</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <KpiCard icon={<Clock size={16} />} tone="amber" label="Ready payouts" value={money(readyTotal)} meta={`${ready.length} trips`} />
        <KpiCard icon={<Lock size={16} />} tone="blue" label="Locked payouts" value={money(lockedTotal)} meta={`${locked.length} trips`} />
        <KpiCard icon={<CheckCircle2 size={16} />} tone="emerald" label="Paid out" value={money(paidTotal)} meta={`${paid.length} trips`} />
      </div>

      <PayoutSection
        sections={sections}
        selected={selected}
        onSelect={setSelected}
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
  sections,
  selected,
  onSelect,
  token,
  onView,
  onSettle,
  onChange,
}: {
  sections: Record<Bucket, { title: string; subtitle: string; rows: AdminPayoutRow[]; emptyMessage: string }>;
  selected: Bucket;
  onSelect: (b: Bucket) => void;
  token: string;
  onView: (tripId: string) => void;
  onSettle: (row: AdminPayoutRow) => void;
  onChange: () => void;
}) {
  const active = sections[selected];
  const order: Bucket[] = ["ready", "locked", "paid"];

  return (
    <section className="mt-6">
      <div className="ui flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {order.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onSelect(b)}
            className={`font-heading rounded-lg px-3 py-1.5 text-base font-semibold transition-colors ${
              selected === b ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {sections[b].title} <span className="ui text-sm font-normal text-muted-foreground">({sections[b].rows.length})</span>
          </button>
        ))}
      </div>
      <p className="ui mt-2 text-xs text-muted-foreground">{active.subtitle}</p>

      <div className="mt-3">
        {active.rows.length === 0 ? (
          <EmptyState
            icon={<Clock size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title="Nothing here"
            subtitle={active.emptyMessage}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Operator &amp; bus</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead className="text-right">Net amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.rows.map((r) => {
                  const operatorId = r.bus?.operator?.id;
                  // Same entry point the Timetable list uses to open a trip's
                  // detail page — it sets the admin_operator_id cookie a real
                  // GET redirect needs, so this has to be a full navigation
                  // (window.location), not client-side routing.
                  const href = operatorId ? `/admin/trip-enter?operatorId=${operatorId}&tripId=${r.id}` : null;
                  return (
                    <TableRow
                      key={r.id}
                      onClick={href ? () => { window.location.href = href; } : undefined}
                      className={href ? "cursor-pointer hover:bg-muted/50" : undefined}
                    >
                      <TableCell>
                        <span className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</span>
                        <p className="ui mt-0.5 text-xs text-muted-foreground">{dateTime(r.depart_at)}</p>
                      </TableCell>
                      <TableCell className="ui text-sm text-muted-foreground">
                        {r.bus?.operator?.name ?? "—"}
                        <span className="block text-xs">Bus {r.bus?.reg_no ?? "—"}</span>
                      </TableCell>
                      <TableCell className="ui text-sm text-muted-foreground">
                        {r.seats_sold} seat{r.seats_sold === 1 ? "" : "s"}
                        <span className="block text-xs">
                          {r.booking_count} booking{r.booking_count === 1 ? "" : "s"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="ui text-xs text-muted-foreground">
                          {money(r.gross)} − {money(r.commission_amount)} ({r.commission_pct}%)
                        </p>
                        <p className="font-heading text-base font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onView(r.id)}
                            className="ui shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
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
                            <span className="ui shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                              Departs {dateTime(r.depart_at)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </section>
  );
}
