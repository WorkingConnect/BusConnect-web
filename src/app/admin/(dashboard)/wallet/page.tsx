"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PiggyBank, Search, Loader2, Users, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminWalletOverview, ApiError, type AdminWalletOverview } from "@/lib/api";

function money(n: number, currency: string) {
  return `${currency} ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminWalletPage() {
  const [overview, setOverview] = useState<AdminWalletOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setOverview(await getAdminWalletOverview(session.access_token));
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

  const filtered = useMemo(() => {
    if (!overview) return [];
    const q = query.trim().toLowerCase();
    if (!q) return overview.wallets;
    return overview.wallets.filter((w) =>
      [w.name, w.email, w.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [overview, query]);

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading wallet balances…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <PiggyBank size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Total money BusConnect currently owes passengers, and who it&apos;s owed to.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Total wallet balance" value={money(overview.totalBalance, overview.currency)} accent />
        <Stat label="Users with a balance" value={String(overview.holderCount)} />
      </div>

      <div className="relative mt-6 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="field pl-9 text-sm"
        />
      </div>

      <p className="ui mt-3 text-xs text-slate-400 dark:text-zinc-500">
        {filtered.length} of {overview.wallets.length} users with a balance
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            {overview.wallets.length === 0 ? (
              <span className="inline-flex items-center gap-2">
                <Users size={16} /> No users currently hold a wallet balance.
              </span>
            ) : (
              "No users match that search."
            )}
          </div>
        ) : (
          filtered.map((w) => (
            <div key={w.passengerId} className="card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-heading font-semibold">{w.name ?? w.email ?? w.phone ?? "—"}</p>
                <p className="ui mt-0.5 truncate text-sm text-slate-500 dark:text-zinc-400">
                  {[w.email, w.phone].filter(Boolean).join(" · ") || "No contact on file"}
                </p>
                <p className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-500">Updated {formatDate(w.updatedAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <p className="font-heading text-lg font-bold text-brand dark:text-blue-400">
                  {money(w.balance, w.currency)}
                </p>
                <Link
                  href={`/admin/users/${w.passengerId}`}
                  className="ui inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Details <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
