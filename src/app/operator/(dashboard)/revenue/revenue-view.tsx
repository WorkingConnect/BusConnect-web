"use client";

import { useMemo, useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import type { OperatorRevenueRow } from "@/lib/api";
import { ViewSlipButton } from "./view-slip-button";

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

export function RevenueView({ rows }: { rows: OperatorRevenueRow[] }) {
  const [routeId, setRouteId] = useState("");
  const [busRegNo, setBusRegNo] = useState("");
  const [date, setDate] = useState("");

  const routeOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.route) map.set(r.route.id, r.route.name);
    });
    return [...map.entries()];
  }, [rows]);

  const busOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.bus) set.add(r.bus.reg_no);
    });
    return [...set].sort();
  }, [rows]);

  const filtered = rows.filter(
    (r) =>
      (!routeId || r.route?.id === routeId) &&
      (!busRegNo || r.bus?.reg_no === busRegNo) &&
      (!date || localDateIso(r.depart_at) === date),
  );

  // Three mutually exclusive buckets, same split as admin's Payouts page:
  // arrived-and-unpaid, not-yet-arrived (still provisional), already paid.
  const ready = filtered.filter((r) => r.status === "arrived" && r.payout_status !== "paid");
  const locked = filtered.filter((r) => r.status !== "arrived" && r.status !== "cancelled");
  const paidOut = filtered.filter((r) => r.payout_status === "paid");

  const sum = (list: OperatorRevenueRow[], key: "net_amount" | "seats_sold") =>
    list.reduce((s, r) => s + r[key], 0);

  const filtersActive = !!routeId || !!busRegNo || !!date;

  return (
    <div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Ready payouts" value={money(sum(ready, "net_amount"))} accent />
        <Stat label="Locked payouts" value={money(sum(locked, "net_amount"))} />
        <Stat label="Paid out" value={money(sum(paidOut, "net_amount"))} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
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
        subtitle="Completed trips awaiting settlement."
        rows={ready}
        emptyMessage="No trips awaiting settlement."
      />
      <RevenueSection
        title="Locked payouts"
        subtitle="Upcoming or in-progress trips — revenue is still provisional until the trip completes."
        rows={locked}
        emptyMessage="No upcoming or in-progress trips."
      />
      <RevenueSection
        title="Paid out"
        subtitle="Already settled."
        rows={paidOut}
        emptyMessage="Nothing settled yet."
      />
    </div>
  );
}

function RevenueSection({
  title,
  subtitle,
  rows,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  rows: OperatorRevenueRow[];
  emptyMessage: string;
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
            <div key={r.trip_id} className="card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</p>
                    {r.payout_status === "paid" ? (
                      <span className="ui shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Paid
                      </span>
                    ) : r.status === "arrived" ? (
                      <span className="ui shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        Pending
                      </span>
                    ) : (
                      <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TRIP_STATUS_STYLE[r.status] ?? TRIP_STATUS_STYLE.scheduled}`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                  <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                    Bus {r.bus?.reg_no ?? "—"} · {dateTime(r.depart_at)}
                  </p>
                  <p className="ui mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                    <Users size={12} /> {r.seats_sold} seat{r.seats_sold === 1 ? "" : "s"} sold
                    {r.payout_status === "paid" && r.paid_at ? ` · paid ${dateTime(r.paid_at)}` : ""}
                    {r.reference ? ` · ref ${r.reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="ui text-xs text-slate-400 dark:text-zinc-500">
                      {money(r.gross)} − {r.commission_pct}%
                    </p>
                    <p className="font-heading text-lg font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</p>
                  </div>
                  {r.payout_status === "paid" && r.has_slip && <ViewSlipButton tripId={r.trip_id} />}
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
