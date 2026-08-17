"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, ArrowUpRight, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAdminPayouts, ApiError, type AdminPayoutRow } from "@/lib/api";
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

export default function AdminRevenuePage() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminPayoutRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewTripId, setViewTripId] = useState<string | null>(null);

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
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
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
  const sum = (list: AdminPayoutRow[], key: "gross" | "net_amount" | "seats_sold" | "commission_amount") =>
    list.reduce((s, r) => s + r[key], 0);
  const filtersActive = !!operatorId || !!routeId || !!busRegNo || !!date;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <TrendingUp size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Every trip across every operator, split by whether it&apos;s finished or still upcoming.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Gross revenue" value={money(sum(filtered, "gross"))} />
        <Stat label="Net revenue" value={money(sum(filtered, "net_amount"))} />
        <Stat label="Ready payouts" value={money(sum(ready, "net_amount"))} accent />
        <Stat label="Locked payouts" value={money(sum(locked, "net_amount"))} />
        <Stat label="BusConnect revenue" value={money(sum(filtered, "commission_amount"))} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
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
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
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
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
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
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
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
            className="ui pb-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            Reset filters
          </button>
        )}
      </div>

      <RevenueSection
        title="Ready payouts"
        subtitle="Completed trips — revenue is final."
        rows={ready}
        emptyMessage="No completed trips yet."
        onView={setViewTripId}
      />
      <RevenueSection
        title="Locked payouts"
        subtitle="Upcoming or in-progress trips — revenue is still provisional until the trip completes."
        rows={locked}
        emptyMessage="No upcoming or in-progress trips with bookings."
        onView={setViewTripId}
      />

      {viewTripId && token && (
        <TripDetailModal token={token} tripId={viewTripId} onClose={() => setViewTripId(null)} />
      )}
    </div>
  );
}

function RevenueSection({
  title,
  subtitle,
  rows,
  emptyMessage,
  onView,
}: {
  title: string;
  subtitle: string;
  rows: AdminPayoutRow[];
  emptyMessage: string;
  onView: (tripId: string) => void;
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
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</p>
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
                  <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                    {r.bus?.operator?.name ?? "—"} · Bus {r.bus?.reg_no ?? "—"} · {dateTime(r.depart_at)}
                  </p>
                  <p className="ui mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                    <Users size={12} /> {r.seats_sold} seat{r.seats_sold === 1 ? "" : "s"} sold · {r.booking_count} booking
                    {r.booking_count === 1 ? "" : "s"}
                    {r.payout_status === "paid" && r.paid_at ? ` · paid ${dateTime(r.paid_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="ui text-xs text-slate-400 dark:text-zinc-500">
                      {money(r.gross)} − {r.commission_pct}%
                    </p>
                    <p className="font-heading text-lg font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onView(r.id)}
                    className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    View <ArrowUpRight size={12} />
                  </button>
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
