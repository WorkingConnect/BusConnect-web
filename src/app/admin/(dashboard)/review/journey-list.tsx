"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { AdminJourney } from "@/lib/api";
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
      <div className="relative mt-6">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search journeys by code, operator, or route…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            {journeys.length === 0 ? "No journeys created yet." : `No journeys match "${query}".`}
          </div>
        ) : (
          filtered.map((j) => <JourneyRow key={j.id} journey={j} />)
        )}
      </div>
    </div>
  );
}

function JourneyRow({ journey: j }: { journey: AdminJourney }) {
  return (
    <div className="card card-hover flex items-start justify-between gap-4 p-4">
      <Link href={`/admin/review/${j.id}`} className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{j.route?.name ?? "—"}</p>
          <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[j.review_status]}`}>
            {j.review_status}
          </span>
        </div>
        <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
          {j.operator?.name ?? "—"} · {j.code ?? "—"} · {formatTime(j.depart_time)} → {formatTime(j.arrive_time)}
        </p>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          {j.bus?.reg_no ?? "—"} · Driver {j.driver?.name ?? "—"} · Conductor {j.conductor?.name ?? "—"} · LKR{" "}
          {Number(j.base_fare).toLocaleString("en-LK")}
        </p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <ReviewStatusActions journeyId={j.id} reviewStatus={j.review_status} />
        <Link
          href={`/admin/review/${j.id}`}
          className="ui mt-1 flex items-center gap-0.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
        >
          Details <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
