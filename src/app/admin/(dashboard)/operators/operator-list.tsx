"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Search, Star } from "lucide-react";
import type { AdminOperator } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "../dashboard-ui";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "On hold",
};

export function OperatorList({ operators }: { operators: AdminOperator[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter((op) => op.name.toLowerCase().includes(q));
  }, [operators, query]);

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
          placeholder="Search operators by name…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={operators.length === 0 ? "No operators yet" : "No matches"}
            subtitle={operators.length === 0 ? "New applications will show up here." : `No operators match "${query}".`}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((op) => (
                  <TableRow key={op.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/admin/operators/${op.id}`} className="flex min-w-0 items-center gap-3">
                        {op.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={op.logo_url}
                            alt={`${op.name} logo`}
                            className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-border" />
                        )}
                        <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                          {op.name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" /> {Number(op.rating).toFixed(1)}
                      </span>
                      <span className="block text-xs">{Number(op.reliability_score).toFixed(0)}% reliability</span>
                    </TableCell>
                    <TableCell>
                      <span className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[op.status]}`}>
                        {STATUS_LABEL[op.status] ?? op.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <StatusActions operatorId={op.id} status={op.status} />
                        <Link
                          href={`/admin/operators/${op.id}`}
                          className="ui inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          View <ChevronRight size={13} />
                        </Link>
                      </div>
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
