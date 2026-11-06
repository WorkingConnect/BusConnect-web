"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search, ClipboardCheck } from "lucide-react";
import type { AdminJourney } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "../dashboard-ui";
import { ReviewStatusActions } from "./review-status-actions";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatTime(hhmmss: string) {
  return hhmmss.slice(0, 5);
}

export function JourneyList({ journeys }: { journeys: AdminJourney[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return journeys;
    return journeys.filter(
      (j) =>
        (j.code?.toLowerCase().includes(q) ?? false) ||
        (j.operator?.name.toLowerCase().includes(q) ?? false) ||
        (j.route?.name.toLowerCase().includes(q) ?? false),
    );
  }, [journeys, query]);

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
          placeholder="Search journeys by code, operator, or route…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={journeys.length === 0 ? "Nothing to review" : "No matches"}
            subtitle={journeys.length === 0 ? "New journeys will show up here." : `No journeys match "${query}".`}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journey</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Bus &amp; crew</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j) => (
                  <TableRow key={j.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/admin/review/${j.id}`} className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-heading font-semibold hover:text-brand dark:hover:text-blue-400">
                          {j.route?.name ?? "—"}
                        </span>
                        <span className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[j.review_status]}`}>
                          {j.review_status}
                        </span>
                      </Link>
                      <p className="ui mt-0.5 text-xs text-muted-foreground">
                        {j.operator?.name ?? "—"} · {j.code ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {formatTime(j.depart_time)} → {formatTime(j.arrive_time)}
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">
                      {j.bus?.reg_no ?? "—"}
                      <span className="block text-xs">
                        {j.driver?.name ?? "—"} · {j.conductor?.name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="ui text-sm tabular-nums text-muted-foreground">
                      LKR {Number(j.base_fare).toLocaleString("en-LK")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ReviewStatusActions journeyId={j.id} reviewStatus={j.review_status} />
                        <Link
                          href={`/admin/review/${j.id}`}
                          className="ui inline-flex items-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ChevronRight size={15} />
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
