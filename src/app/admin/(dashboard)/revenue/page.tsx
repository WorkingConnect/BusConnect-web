"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, ArrowUpRight, ChevronDown, Loader2, Wallet, TrendingUp, Lock, HandCoins, Banknote, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAdminPayouts, ApiError, type AdminPayoutRow } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";
import { TripDetailModal } from "../payouts/trip-detail-modal";

const TRIP_STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  boarding: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  departed: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
};

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function localDateIso(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

type Bucket = "ready" | "locked";

export default function AdminRevenuePage() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminPayoutRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewTripId, setViewTripId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Bucket>("ready");

  const [operatorId, setOperatorId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [busRegNo, setBusRegNo] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    (rows ?? []).forEach((r) => {
      if (r.bus?.operator) map.set(r.bus.operator.id, r.bus.operator.name);
    });
    return [...map.entries()];
  }, [rows]);

  const routeOptions = useMemo(() => {
    const map = new Map<string, string>();
    (rows ?? []).forEach((r) => {
      if (r.route) map.set(r.route.id, r.route.name);
    });
    return [...map.entries()];
  }, [rows]);

  const busOptions = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.bus) set.add(r.bus.reg_no);
    });
    return [...set].sort();
  }, [rows]);

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading revenue…
      </div>
    );
  }

  const filtered = rows.filter(
    (r) =>
      (!operatorId || r.bus?.operator?.id === operatorId) &&
      (!routeId || r.route?.id === routeId) &&
      (!busRegNo || r.bus?.reg_no === busRegNo) &&
      (!date || localDateIso(r.depart_at) === date),
  );
  const ready = filtered.filter((r) => r.status === "arrived");
  const locked = filtered.filter((r) => r.status !== "arrived" && r.status !== "cancelled");
  const sum = (
    list: AdminPayoutRow[],
    key: "gross" | "net_amount" | "seats_sold" | "commission_amount" | "walkup_gross",
  ) => list.reduce((s, r) => s + r[key], 0);
  const filtersActive = !!operatorId || !!routeId || !!busRegNo || !!date;

  const sections: Record<Bucket, { title: string; subtitle: string; rows: AdminPayoutRow[]; emptyMessage: string }> = {
    ready: {
      title: "Ready payouts",
      subtitle: "Completed trips. Revenue is final.",
      rows: ready,
      emptyMessage: "No completed trips yet.",
    },
    locked: {
      title: "Locked payouts",
      subtitle: "Upcoming or in-progress trips. Revenue is still provisional until the trip completes.",
      rows: locked,
      emptyMessage: "No upcoming or in-progress trips with bookings.",
    },
  };

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Revenue</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Every trip across every operator, split by whether it&apos;s finished or still upcoming.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<TrendingUp size={16} />} tone="blue" label="Gross revenue" value={money(sum(filtered, "gross"))} />
        <KpiCard icon={<Wallet size={16} />} tone="purple" label="Net revenue" value={money(sum(filtered, "net_amount"))} />
        <KpiCard icon={<HandCoins size={16} />} tone="emerald" label="Ready payouts" value={money(sum(ready, "net_amount"))} />
        <KpiCard icon={<Lock size={16} />} tone="amber" label="Locked payouts" value={money(sum(locked, "net_amount"))} />
        <KpiCard icon={<Percent size={16} />} tone="blue" label="BusConnect revenue" value={money(sum(filtered, "commission_amount"))} />
        <KpiCard icon={<Banknote size={16} />} tone="slate" label="Walk-in revenue" value={money(sum(filtered, "walkup_gross"))} />
      </div>
      <p className="ui mt-2 text-xs text-muted-foreground">
        Walk-in revenue is cash collected directly by the operator&apos;s conductor. It never passes through
        BusConnect, so it&apos;s excluded from every other figure above.
      </p>

      <Card className="mt-5">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Operator
            <div className="relative">
              <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="field appearance-none py-2 pr-8 text-sm">
                <option value="">All operators</option>
                {operatorOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Route
            <div className="relative">
              <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="field appearance-none py-2 pr-8 text-sm">
                <option value="">All routes</option>
                {routeOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Bus
            <div className="relative">
              <select value={busRegNo} onChange={(e) => setBusRegNo(e.target.value)} className="field appearance-none py-2 pr-8 text-sm">
                <option value="">All buses</option>
                {busOptions.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field py-2 text-sm" />
          </label>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setOperatorId("");
                setRouteId("");
                setBusRegNo("");
                setDate("");
              }}
              className="ui pb-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Reset filters
            </button>
          )}
        </div>
      </Card>

      <RevenueSection sections={sections} selected={selected} onSelect={setSelected} onView={setViewTripId} />

      {viewTripId && token && (
        <TripDetailModal token={token} tripId={viewTripId} onClose={() => setViewTripId(null)} />
      )}
    </div>
  );
}

function RevenueSection({
  sections,
  selected,
  onSelect,
  onView,
}: {
  sections: Record<Bucket, { title: string; subtitle: string; rows: AdminPayoutRow[]; emptyMessage: string }>;
  selected: Bucket;
  onSelect: (b: Bucket) => void;
  onView: (tripId: string) => void;
}) {
  const active = sections[selected];
  const order: Bucket[] = ["ready", "locked"];

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
            icon={<Wallet size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
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
                {active.rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</span>
                        {r.status === "arrived" ? (
                          r.payout_status === "paid" ? (
                            <span className="ui shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Paid
                            </span>
                          ) : (
                            <span className="ui shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              Pending
                            </span>
                          )
                        ) : (
                          <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TRIP_STATUS_STYLE[r.status] ?? TRIP_STATUS_STYLE.scheduled}`}>
                            {r.status}
                          </span>
                        )}
                      </div>
                      <p className="ui mt-0.5 text-xs text-muted-foreground">
                        {dateTime(r.depart_at)}
                        {r.walkup_count > 0 ? ` · ${r.walkup_count} walk-in (${money(r.walkup_gross)})` : ""}
                        {r.payout_status === "paid" && r.paid_at ? ` · paid ${dateTime(r.paid_at)}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {r.bus?.operator?.name ?? "—"}
                      <span className="block text-xs">Bus {r.bus?.reg_no ?? "—"}</span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} /> {r.seats_sold}
                      </span>
                      <span className="block text-xs">
                        {r.booking_count} booking{r.booking_count === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="ui text-xs text-muted-foreground">
                        {money(r.gross)} − {r.commission_pct}%
                      </p>
                      <p className="font-heading text-base font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => onView(r.id)}
                        className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        View <ArrowUpRight size={12} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </section>
  );
}
