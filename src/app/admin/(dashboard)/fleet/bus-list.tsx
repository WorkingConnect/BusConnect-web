"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bus as BusIcon, ChevronRight, Search } from "lucide-react";
import type { AdminBus } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "../dashboard-ui";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export function BusList({ buses }: { buses: AdminBus[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter(
      (b) => b.reg_no.toLowerCase().includes(q) || (b.operator?.name.toLowerCase().includes(q) ?? false),
    );
  }, [buses, query]);

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
          placeholder="Search buses by registration no. or operator…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BusIcon size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={buses.length === 0 ? "No buses registered yet" : "No matches"}
            subtitle={buses.length === 0 ? "New registrations will show up here." : `No buses match "${query}".`}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bus</TableHead>
                  <TableHead>Operator &amp; type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <BusRow key={b.id} bus={b} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

function BusRow({ bus: b }: { bus: AdminBus }) {
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <Link href={`/admin/fleet/${b.id}`} className="flex min-w-0 items-center gap-3">
          {b.front_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.front_image_url}
              alt={`${b.reg_no} front`}
              className="h-10 w-14 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <BusIcon size={14} />
            </div>
          )}
          <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
            {b.reg_no}
          </span>
        </Link>
        {b.notes && <p className="ui mt-0.5 truncate text-xs italic text-muted-foreground">&ldquo;{b.notes}&rdquo;</p>}
      </TableCell>
      <TableCell className="ui text-sm text-muted-foreground">
        {b.operator?.name ?? "—"}
        <span className="block text-xs">
          {b.bus_type?.name ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[b.status]}`}>
          {b.status}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <StatusActions busId={b.id} status={b.status} />
          <Link
            href={`/admin/fleet/${b.id}`}
            className="ui inline-flex items-center gap-0.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Details <ChevronRight size={13} />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
