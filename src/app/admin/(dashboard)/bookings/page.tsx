"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, ArrowUpRight, Trash2, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listAllAdminBookings,
  findAdminBookingById,
  findAdminBookingsByEmail,
  hideAdminBooking,
  ApiError,
  type AdminBooking,
} from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function AdminBookingsPage() {
  const [mode, setMode] = useState<"id" | "email">("id");
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
      } else {
        const list = await findAdminBookingsByEmail(session.access_token, query.trim());
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
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Every booking platform-wide, grouped by operator — search below to jump straight to one.
      </p>

      <form onSubmit={search} className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="ui flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
          {(["id", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                mode === m
                  ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                  : "text-slate-500 dark:text-zinc-400"
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
          placeholder={mode === "id" ? "Booking ID (UUID)" : "passenger@email.com"}
          required
          className="field flex-1"
        />
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {searched ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="ui text-sm font-semibold text-slate-500 dark:text-zinc-400">Search results</p>
            <button
              type="button"
              onClick={clearSearch}
              className="ui text-xs font-medium text-slate-500 underline hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Back to all bookings
            </button>
          </div>
          {!error && !busy && results.length === 0 && (
            <p className="ui mt-4 text-sm text-slate-500 dark:text-zinc-400">No bookings found.</p>
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
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : groups.length === 0 ? (
        <p className="ui mt-4 text-sm text-slate-500 dark:text-zinc-400">No bookings yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {groups.map(([operatorName, bookings]) => (
            <div key={operatorName}>
              <p className="ui mb-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">
                {operatorName}{" "}
                <span className="font-normal text-slate-400 dark:text-zinc-600">
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

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">
          {b.trip?.bus?.operator?.name ?? "—"} · Seats {b.seats.join(", ")}
        </p>
        <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[b.status] ?? ""}`}>
          {b.status.replace("_", " ")}
        </span>
      </div>
      <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Ref {b.id} · booked {new Date(b.created_at).toLocaleString("en-LK")}
        {b.trip && ` · departs ${new Date(b.trip.depart_at).toLocaleString("en-LK")}`}
      </p>
      <p className="mt-2 font-heading font-bold text-brand dark:text-blue-400">
        LKR {Number(b.amount).toLocaleString("en-LK")}
      </p>
      {(b.payments?.length ?? 0) > 0 && (
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Payments: {b.payments!.map((p) => `${p.status} (LKR ${p.amount})`).join(", ")}
        </p>
      )}
      {(b.refunds?.length ?? 0) > 0 && (
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          Refunds: {b.refunds!.map((r) => `${r.status} (LKR ${r.amount})`).join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
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
          <span className="ui inline-flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500">
            <EyeOff size={12} /> Hidden from passenger
          </span>
        ) : confirming ? (
          <div className="flex items-center gap-1.5">
            {error && <span className="ui text-xs text-red-600 dark:text-red-400">{error}</span>}
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="ui rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
            className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/30"
          >
            <Trash2 size={12} /> Hide
          </button>
        )}
      </div>
    </div>
  );
}
