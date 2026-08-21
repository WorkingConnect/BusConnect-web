"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Search, Users } from "lucide-react";
import type { AdminTrip } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  boarding: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  departed: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function colomboDateKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}
function prettyDate(key: string) {
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function colomboTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-LK", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" });
}

export function TimetableList({ trips }: { trips: AdminTrip[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const statuses = useMemo(() => {
    const seen = new Set(trips.map((t) => t.status));
    return ["all", ...Array.from(seen)];
  }, [trips]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (!q) return true;
      return (
        (t.route?.name.toLowerCase().includes(q) ?? false) ||
        (t.bus?.operator?.name.toLowerCase().includes(q) ?? false) ||
        (t.bus?.reg_no.toLowerCase().includes(q) ?? false)
      );
    });
  }, [trips, query, status]);

  const byDate = useMemo(() => {
    const map = new Map<string, AdminTrip[]>();
    for (const t of filtered) {
      const key = colomboDateKey(t.depart_at);
      const bucket = map.get(key);
      if (bucket) bucket.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by route, operator, or bus reg. no…"
            className="field pl-9 text-sm focus:ring-0"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="field w-full text-sm capitalize focus:ring-0 sm:w-40"
        >
          {statuses.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
      </div>

      {byDate.size === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
          <CalendarRange size={28} className="mx-auto mb-3 text-slate-300 dark:text-zinc-700" />
          {trips.length === 0 ? "No upcoming trips scheduled by any operator yet." : `No trips match "${query}".`}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {[...byDate.entries()].map(([date, dayTrips]) => (
            <div key={date}>
              <p className="ui mb-2 text-sm font-semibold text-slate-500 dark:text-zinc-400">
                {prettyDate(date)}{" "}
                <span className="font-normal text-slate-400 dark:text-zinc-600">
                  · {dayTrips.length} trip{dayTrips.length === 1 ? "" : "s"}
                </span>
              </p>
              <div className="flex flex-col gap-2">
                {dayTrips.map((t) => {
                  const operatorId = t.bus?.operator?.id;
                  const href = operatorId ? `/admin/trip-enter?operatorId=${operatorId}&tripId=${t.id}` : null;
                  const row = (
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                        <span
                          className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[t.status] ?? STATUS_STYLE.scheduled}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="ui mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-zinc-400">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">
                          {t.bus?.operator?.name ?? "—"}
                        </span>
                        <span className="text-slate-300 dark:text-zinc-700">·</span>
                        <span className="flex items-center gap-1">
                          <Users size={13} />
                          {t.bus?.bus_type?.name ?? "—"} · {t.bus?.bus_type?.seat_count ?? "—"} seats · Bus{" "}
                          {t.bus?.reg_no ?? "—"}
                        </span>
                      </p>
                    </div>
                  );
                  return href ? (
                    <a key={t.id} href={href} className="card card-hover flex items-center justify-between gap-3 p-4">
                      {row}
                      <span className="shrink-0 font-heading font-bold text-brand dark:text-blue-400">
                        {colomboTime(t.depart_at)}
                      </span>
                    </a>
                  ) : (
                    <div key={t.id} className="card flex items-center justify-between gap-3 p-4">
                      {row}
                      <span className="shrink-0 font-heading font-bold text-brand dark:text-blue-400">
                        {colomboTime(t.depart_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
