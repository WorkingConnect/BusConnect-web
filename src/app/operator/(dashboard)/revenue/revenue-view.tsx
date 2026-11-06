"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronDown, Loader2, Trash2, Download, Clock, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hideOperatorRevenueRow, getOperatorPayoutSlipUrl, ApiError, type OperatorRevenueRow } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "../dashboard-ui";

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

type Bucket = "ready" | "locked" | "paid";

export function RevenueView({ rows: initialRows }: { rows: OperatorRevenueRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [routeId, setRouteId] = useState("");
  const [busRegNo, setBusRegNo] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Bucket>("ready");

  function handleHidden(tripId: string) {
    setRows((prev) => prev.filter((r) => r.trip_id !== tripId));
  }

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

  const sections: Record<Bucket, { title: string; subtitle: string; rows: OperatorRevenueRow[]; emptyMessage: string }> = {
    ready: {
      title: "Ready payouts",
      subtitle: "Completed trips awaiting settlement.",
      rows: ready,
      emptyMessage: "No trips awaiting settlement.",
    },
    locked: {
      title: "Locked payouts",
      subtitle: "Upcoming or in-progress trips. Revenue is still provisional until the trip completes.",
      rows: locked,
      emptyMessage: "No upcoming or in-progress trips.",
    },
    paid: {
      title: "Paid out",
      subtitle: "Already settled.",
      rows: paidOut,
      emptyMessage: "Nothing settled yet.",
    },
  };

  return (
    <div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          feature
          icon={<Clock size={16} />}
          label="Ready payouts"
          value={money(sum(ready, "net_amount"))}
          meta={`${ready.length} trip${ready.length === 1 ? "" : "s"}`}
        />
        <KpiCard
          icon={<Lock size={16} />}
          label="Locked payouts"
          value={money(sum(locked, "net_amount"))}
          meta={`${locked.length} trip${locked.length === 1 ? "" : "s"}`}
        />
        <KpiCard
          icon={<CheckCircle2 size={16} />}
          label="Paid out"
          value={money(sum(paidOut, "net_amount"))}
          meta={`${paidOut.length} trip${paidOut.length === 1 ? "" : "s"}`}
        />
      </div>

      <Card className="mt-5">
        <div className="flex flex-wrap items-end gap-3 p-4">
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

      <RevenueSection sections={sections} selected={selected} onSelect={setSelected} onHidden={handleHidden} />
    </div>
  );
}

function RevenueSection({
  sections,
  selected,
  onSelect,
  onHidden,
}: {
  sections: Record<Bucket, { title: string; subtitle: string; rows: OperatorRevenueRow[]; emptyMessage: string }>;
  selected: Bucket;
  onSelect: (b: Bucket) => void;
  onHidden: (tripId: string) => void;
}) {
  const active = sections[selected];
  const order: Bucket[] = ["ready", "locked", "paid"];
  const router = useRouter();

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
            {sections[b].title}{" "}
            <span className="ui text-sm font-normal text-muted-foreground">({sections[b].rows.length})</span>
          </button>
        ))}
      </div>
      <p className="ui mt-2 text-xs text-muted-foreground">{active.subtitle}</p>

      <div className="mt-3">
        {active.rows.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted-foreground">{active.emptyMessage}</div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Bus &amp; departure</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead className="text-right">Net amount</TableHead>
                  {selected === "paid" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.rows.map((r) => (
                  <TableRow
                    key={r.trip_id}
                    onClick={() => router.push(`/operator/trips/${r.trip_id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</span>
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
                      {(r.paid_at || r.reference) && (
                        <p className="ui mt-0.5 text-xs text-muted-foreground">
                          {r.paid_at ? `Paid ${dateTime(r.paid_at)}` : ""}
                          {r.paid_at && r.reference ? " · " : ""}
                          {r.reference ? `Ref ${r.reference}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {r.bus?.reg_no ?? "—"}
                      <span className="block text-xs">{dateTime(r.depart_at)}</span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} /> {r.seats_sold}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-heading font-bold text-brand dark:text-blue-400">{money(r.net_amount)}</span>
                    </TableCell>
                    {selected === "paid" && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {r.has_slip && <DownloadReceiptButton tripId={r.trip_id} />}
                          <DeleteRevenueRowButton tripId={r.trip_id} onHidden={() => onHidden(r.trip_id)} />
                        </div>
                      </TableCell>
                    )}
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

function DownloadReceiptButton({ tripId }: { tripId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { url } = await getOperatorPayoutSlipUrl(session.access_token, tripId);
      // Fetch as a blob rather than just pointing an <a download> at the
      // signed URL — a cross-origin href's `download` attribute is ignored
      // by most browsers, so this is what actually guarantees a save
      // instead of a plain navigation.
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `payout-receipt-${tripId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not download the receipt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        aria-label="Download receipt"
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      </button>
      {error && <span className="ui text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}

function DeleteRevenueRowButton({ tripId, onHidden }: { tripId: string; onHidden: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmHide() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await hideOperatorRevenueRow(session.access_token, tripId);
      onHidden();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove this row.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="ui rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmHide}
            disabled={busy}
            className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove
          </button>
        </div>
        {error && <span className="ui text-[11px] text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Remove this row"
      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
    >
      <Trash2 size={14} />
    </button>
  );
}
