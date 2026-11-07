"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, User } from "lucide-react";
import type { AdminPilot } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "../dashboard-ui";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

export interface PilotWithPhoto extends AdminPilot {
  photoUrl: string | null;
}

export function PilotList({ pilots }: { pilots: PilotWithPhoto[] }) {
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    // Pending pilots surface to the top (need review); everything else keeps
    // the backend's created_at-desc order. Array.prototype.sort is stable,
    // so within each group the original order is preserved.
    return [...pilots].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  }, [pilots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => p.name.toLowerCase().includes(q));
  }, [sorted, query]);

  return (
    <div>
      <div className="relative mt-6 max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pilots by name…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<User size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={pilots.length === 0 ? "No pilots registered yet" : "No matches"}
            subtitle={pilots.length === 0 ? "New registrations will show up here." : `No pilots match "${query}".`}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pilot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operator &amp; contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <PilotRow key={p.id} pilot={p} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

function PilotRow({ pilot }: { pilot: PilotWithPhoto }) {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <Link href={`/admin/pilots/${pilot.id}`} className="flex min-w-0 items-center gap-3">
          {pilot.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pilot.photoUrl}
              alt={`${pilot.name} photo`}
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
              <User size={15} />
            </div>
          )}
          <span className="truncate font-medium hover:text-brand dark:hover:text-blue-400">{pilot.name}</span>
        </Link>
        {pilot.bus && (
          <p className="ui mt-0.5 truncate text-xs capitalize text-muted-foreground">
            {pilot.assigned_role} · {pilot.bus.reg_no}
          </p>
        )}
      </TableCell>
      <TableCell>
        <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[pilot.status]}`}>
          {STATUS_LABEL[pilot.status] ?? pilot.status}
        </span>
      </TableCell>
      <TableCell className="ui text-sm text-muted-foreground">
        {pilot.operator?.name ?? "—"}
        <span className="block text-xs">
          {pilot.phone_no}
          {pilot.user_id && <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">· Account linked</span>}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <StatusActions pilotId={pilot.id} status={pilot.status} />
          <Link
            href={`/admin/pilots/${pilot.id}`}
            className="ui inline-flex items-center gap-0.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            View <ChevronRight size={13} />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
