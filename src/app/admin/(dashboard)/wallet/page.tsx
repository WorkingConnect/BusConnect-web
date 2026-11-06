"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, Users, ArrowUpRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminWalletOverview, ApiError, type AdminWalletOverview } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";

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
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading wallet balances…
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Wallet</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Total money BusConnect currently owes passengers, and who it&apos;s owed to.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <KpiCard icon={<Wallet size={16} />} tone="emerald" label="Total balance" value={money(overview.totalBalance, overview.currency)} />
        <KpiCard icon={<Users size={16} />} tone="blue" label="Users with a balance" value={String(overview.holderCount)} />
      </div>

      <div className="relative mt-6 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="field pl-9 text-sm"
        />
      </div>

      <p className="ui mt-3 text-xs text-muted-foreground">
        {filtered.length} of {overview.wallets.length} users with a balance
      </p>

      <div className="mt-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={overview.wallets.length === 0 ? "No wallet balances" : "No matches"}
            subtitle={overview.wallets.length === 0 ? "No users currently hold a wallet balance." : "No users match that search."}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.passengerId} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="truncate font-heading font-semibold">{w.name ?? w.email ?? w.phone ?? "—"}</span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {[w.email, w.phone].filter(Boolean).join(" · ") || "No contact on file"}
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">{formatDate(w.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-heading font-bold text-brand dark:text-blue-400">
                        {money(w.balance, w.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/users/${w.passengerId}`}
                        className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Details <ArrowUpRight size={12} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
