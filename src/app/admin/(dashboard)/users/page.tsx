"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search, Loader2, ArrowUpRight, UserCheck, Building2, IdCard, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listAdminUsers, ApiError, type AdminUserSummary } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
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
      setUsers(await listAdminUsers(session.access_token));
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
    if (!users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone, ...u.roles.operator.map((o) => o.name)]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [users, query]);

  const counts = useMemo(
    () => ({
      passengers: (users ?? []).filter((u) => u.roles.passenger).length,
      operators: (users ?? []).filter((u) => u.roles.operator.length > 0).length,
      pilots: (users ?? []).filter((u) => u.roles.pilot).length,
      admins: (users ?? []).filter((u) => u.roles.admin).length,
    }),
    [users],
  );

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!users) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading users…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <Users size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Users</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Every account on the platform: passengers, operators, pilots, and admins.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<UserCheck size={16} />} tone="slate" label="Passengers" value={counts.passengers} />
        <StatTile icon={<Building2 size={16} />} tone="blue" label="Operators" value={counts.operators} />
        <StatTile icon={<IdCard size={16} />} tone="amber" label="Pilots" value={counts.pilots} />
        <StatTile icon={<ShieldCheck size={16} />} tone="emerald" label="Admins" value={counts.admins} />
      </div>

      <div className="relative mt-6 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, or operator…"
          className="field pl-9 text-sm"
        />
      </div>

      <p className="ui mt-3 text-xs text-slate-400 dark:text-zinc-500">
        {filtered.length} of {users.length} users
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">No users match that search.</div>
        ) : (
          filtered.map((u) => {
            const displayName = u.name ?? u.email ?? u.phone ?? "—";
            return (
              <div key={u.id} className="card flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg" className="shrink-0 overflow-hidden">
                    <AvatarFallback className="bg-brand-soft text-base leading-none font-bold text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-heading font-semibold">{displayName}</p>
                      {u.roles.passenger && <RoleBadge label="Passenger" tone="slate" />}
                      {u.roles.operator.map((o, i) => (
                        <RoleBadge key={i} label={`${o.role === "owner" ? "Operator" : "Operator staff"} · ${o.name}`} tone="blue" />
                      ))}
                      {u.roles.pilot && <RoleBadge label={`Pilot (${u.roles.pilot.status})`} tone="amber" />}
                      {u.roles.admin && <RoleBadge label="Admin" tone="emerald" />}
                      {u.deleted && <RoleBadge label="Deleted" tone="red" />}
                    </div>
                    <p className="ui mt-0.5 truncate text-sm text-slate-500 dark:text-zinc-400">
                      {[u.email, u.phone].filter(Boolean).join(" · ") || "No contact on file"}
                    </p>
                    <p className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-500">Joined {formatDate(u.created_at)}</p>
                  </div>
                </div>
                <Button render={<Link href={`/admin/users/${u.id}`} />} nativeButton={false} variant="outline" size="sm" className="shrink-0 gap-1 rounded-lg">
                  Details <ArrowUpRight size={12} />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const TONE_STYLE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function RoleBadge({ label, tone }: { label: string; tone: keyof typeof TONE_STYLE }) {
  return <Badge className={`ui shrink-0 rounded-full border-transparent font-semibold ${TONE_STYLE[tone]}`}>{label}</Badge>;
}

function StatTile({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLE;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_STYLE[tone]}`}>{icon}</span>
      <div className="mt-3 font-heading text-xl font-bold tracking-tight">{value}</div>
      <div className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{label}</div>
    </div>
  );
}
