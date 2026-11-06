"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Search, ShieldAlert, Users } from "lucide-react";
import type { AdminTrip } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { EmptyState } from "../dashboard-ui";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  boarding: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  departed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  arrived: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

type Section = "upcoming" | "completed" | "cancelled";

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
  const [section, setSection] = useState<Section>("upcoming");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  // Mutually exclusive across the whole trip_status enum: a trip is either
  // still on its way (upcoming), done (completed/arrived), or cancelled —
  // never more than one of these sections at once, and once it moves to
  // Completed/Cancelled it's out of Upcoming for good.
  const sections = useMemo(() => {
    const upcoming = trips.filter((t) => t.status === "scheduled" || t.status === "boarding" || t.status === "departed");
    const completed = trips.filter((t) => t.status === "arrived");
    const cancelled = trips.filter((t) => t.status === "cancelled");
    return { upcoming, completed, cancelled };
  }, [trips]);

  const activeTrips = sections[section];

  const statuses = useMemo(() => {
    const seen = new Set(activeTrips.map((t) => t.status));
    return ["all", ...Array.from(seen)];
  }, [activeTrips]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeTrips.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (!q) return true;
      return (
        (t.route?.name.toLowerCase().includes(q) ?? false) ||
        (t.bus?.operator?.name.toLowerCase().includes(q) ?? false) ||
        (t.bus?.reg_no.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activeTrips, query, status]);

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

  const tabs: { id: Section; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <div className="ui mt-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSection(t.id);
              setStatus("all");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              section === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="font-normal text-muted-foreground">({sections[t.id].length})</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by route, operator, or bus reg. no…"
            className="field pl-9 text-sm focus:ring-0"
          />
        </div>
        {statuses.length > 2 && (
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
        )}
      </div>

      {byDate.size === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarRange size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />}
            title={activeTrips.length === 0 ? `No ${section} trips` : "No matches"}
            subtitle={activeTrips.length === 0 ? "Trips will show up here once scheduled." : `No trips match "${query}".`}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {[...byDate.entries()].map(([date, dayTrips]) => (
            <div key={date}>
              <p className="ui mb-2 text-sm font-semibold text-muted-foreground">
                {prettyDate(date)} <span className="font-normal">· {dayTrips.length} trip{dayTrips.length === 1 ? "" : "s"}</span>
              </p>
              <Card>
                <div className="flex flex-col">
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
                          {t.cancellation_requested_at && (
                            <span className="ui flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              <ShieldAlert size={11} /> Cancellation requested
                            </span>
                          )}
                        </div>
                        <p className="ui mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{t.bus?.operator?.name ?? "—"}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users size={13} />
                            {t.bus?.bus_type?.name ?? "—"} · {t.bus?.bus_type?.seat_count ?? "—"} seats · Bus{" "}
                            {t.bus?.reg_no ?? "—"}
                          </span>
                        </p>
                      </div>
                    );
                    return href ? (
                      <a
                        key={t.id}
                        href={href}
                        className="flex items-center justify-between gap-3 border-b border-border p-4 transition-colors last:border-0 hover:bg-muted/50"
                      >
                        {row}
                        <span className="shrink-0 font-heading font-bold text-brand dark:text-blue-400">
                          {colomboTime(t.depart_at)}
                        </span>
                      </a>
                    ) : (
                      <div key={t.id} className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-0">
                        {row}
                        <span className="shrink-0 font-heading font-bold text-brand dark:text-blue-400">
                          {colomboTime(t.depart_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
