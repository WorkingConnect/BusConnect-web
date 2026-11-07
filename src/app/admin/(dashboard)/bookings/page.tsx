"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ArrowUpRight, Trash2, EyeOff, Ticket, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listAllAdminBookings,
  findAdminBookingById,
  findAdminBookingsByEmail,
  findAdminBookingsByCode,
  hideAdminBooking,
  ApiError,
  type AdminBooking,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { KpiCard } from "../dashboard-ui";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdminBookingsPage() {
  const [mode, setMode] = useState<"code" | "id" | "email">("code");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminBooking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Default view: every booking platform-wide (most recent 200), grouped by
  // operator into cards — the search box below is only needed to jump to a
  // specific older booking a search wouldn't otherwise surface.
  const [allBookings, setAllBookings] = useState<AdminBooking[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const list = await listAllAdminBookings(session.access_token);
        if (!cancelled) setAllBookings(list);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, AdminBooking[]>();
    for (const b of allBookings ?? []) {
      const key = b.trip?.bus?.operator?.name ?? "Unknown operator";
      const bucket = map.get(key);
      if (bucket) bucket.push(b);
      else map.set(key, [b]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allBookings]);

  function updateBooking(id: string, patch: Partial<AdminBooking>) {
    setAllBookings((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev);
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setSearched(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");

      if (mode === "id") {
        const b = await findAdminBookingById(session.access_token, query.trim());
        setResults([b]);
      } else if (mode === "email") {
        const list = await findAdminBookingsByEmail(session.access_token, query.trim());
        setResults(list);
      } else {
        const list = await findAdminBookingsByCode(session.access_token, query.trim());
        setResults(list);
      }
    } catch (e) {
      setResults([]);
      setError(e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?");
    } finally {
      setBusy(false);
    }
  }

  function clearSearch() {
    setSearched(false);
    setQuery("");
    setResults([]);
    setError(null);
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Bookings</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Every booking platform-wide, grouped by operator. Search below to jump straight to one — by
        the booking code shown on the passenger&rsquo;s ticket, the full booking ID, or their email.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
        <KpiCard icon={<Ticket size={16} />} tone="blue" label="Loaded" value={String(allBookings?.length ?? 0)} />
        <KpiCard icon={<Building2 size={16} />} tone="purple" label="Operators" value={String(groups.length)} />
      </div>

      <Card className="mt-6">
        <form onSubmit={search} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="ui flex gap-1 rounded-xl bg-muted p-1">
            {(["code", "id", "email"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                by {m}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "code"
                ? "Booking code (e.g. 6F3A9B)"
                : mode === "id"
                  ? "Booking ID (UUID)"
                  : "passenger@email.com"
            }
            required
            className="field flex-1"
          />
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </form>
      </Card>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {searched ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="ui text-sm font-semibold text-muted-foreground">Search results</p>
            <button
              type="button"
              onClick={clearSearch}
              className="ui text-xs font-medium text-muted-foreground underline hover:text-foreground"
            >
              Back to all bookings
            </button>
          </div>
          {!error && !busy && results.length === 0 && (
            <p className="ui mt-4 text-sm text-muted-foreground">No bookings found.</p>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {results.map((b) => (
              <ResultCard key={b.id} b={b} onHidden={() => updateBooking(b.id, { hidden_by_passenger: true })} />
            ))}
          </div>
        </>
      ) : loadError ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </p>
      ) : allBookings === null ? (
        <div className="mt-6 flex justify-center p-10">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <p className="ui mt-4 text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map(([operatorName, bookings]) => (
            <div key={operatorName}>
              <p className="ui mb-2 text-sm font-semibold text-muted-foreground">
                {operatorName}{" "}
                <span className="font-normal text-muted-foreground">
                  · {bookings.length} booking{bookings.length === 1 ? "" : "s"}
                </span>
              </p>
              <div className="flex flex-col gap-3">
                {bookings.map((b) => (
                  <ResultCard key={b.id} b={b} onHidden={() => updateBooking(b.id, { hidden_by_passenger: true })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ b, onHidden }: { b: AdminBooking; onHidden: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmHide() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await hideAdminBooking(session.access_token, b.id);
      onHidden();
      setConfirming(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not hide this booking.");
    } finally {
      setBusy(false);
    }
  }

  const metaParts = [
    `Ref ${b.id}`,
    `booked ${new Date(b.created_at).toLocaleDateString("en-LK")}`,
    ...(b.trip ? [`departs ${new Date(b.trip.depart_at).toLocaleDateString("en-LK")}`] : []),
  ];
  const paymentRefundParts = [
    ...(b.payments?.map((p) => `Paid ${p.status} (LKR ${p.amount})`) ?? []),
    ...(b.refunds?.map((r) => `Refund ${r.status} (LKR ${r.amount})`) ?? []),
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate font-medium">
              {b.trip?.bus?.operator?.name ?? "—"} · Seats {b.seats.join(", ")}
            </span>
            <span
              className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLE[b.status] ?? ""}`}
            >
              {b.status.replace("_", " ")}
            </span>
          </p>
          <p className="ui mt-1 text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
          {paymentRefundParts.length > 0 && (
            <p className="ui mt-1 text-xs text-muted-foreground">{paymentRefundParts.join(" · ")}</p>
          )}
        </div>
        <p className="ui shrink-0 font-heading font-bold text-brand dark:text-blue-400">
          LKR {Number(b.amount).toLocaleString("en-LK")}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        {b.passenger_id ? (
          <Link
            href={`/admin/users/${b.passenger_id}`}
            className="ui inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline dark:text-blue-400"
          >
            View user <ArrowUpRight size={12} />
          </Link>
        ) : (
          <span />
        )}

        {b.hidden_by_passenger ? (
          <span className="ui inline-flex items-center gap-1 text-xs text-muted-foreground">
            <EyeOff size={12} /> Hidden from passenger
          </span>
        ) : confirming ? (
          <div className="flex items-center gap-1.5">
            {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="ui rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmHide}
              disabled={busy}
              className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Confirm hide
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 size={12} /> Hide
          </button>
        )}
      </div>
    </Card>
  );
}
