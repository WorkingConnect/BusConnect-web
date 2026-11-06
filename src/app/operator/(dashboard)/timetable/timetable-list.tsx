"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, Users } from "lucide-react";
import type { OperatorTrip } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { RequestCancellationButton } from "./request-cancellation-button";

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

// Mirrors BusConnect-web's admin Timetable list — same three mutually
// exclusive sections, partitioning the full trip_status enum: a trip is
// either still on its way (Upcoming), done (Completed/arrived), or
// Cancelled, never more than one at a time. Once it moves to Completed or
// Cancelled it's out of Upcoming for good — no trip is ever hard-removed
// here, an operator has no delete power; only admin can permanently erase
// one (see admin/timetable).
export function TimetableList({ trips }: { trips: OperatorTrip[] }) {
  const [section, setSection] = useState<Section>("upcoming");

  const sections = useMemo(() => {
    const upcoming = trips
      .filter((t) => t.status === "scheduled" || t.status === "boarding" || t.status === "departed")
      .sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());
    const completed = trips
      .filter((t) => t.status === "arrived")
      .sort((a, b) => new Date(b.depart_at).getTime() - new Date(a.depart_at).getTime());
    const cancelled = trips
      .filter((t) => t.status === "cancelled")
      .sort((a, b) => new Date(b.depart_at).getTime() - new Date(a.depart_at).getTime());
    return { upcoming, completed, cancelled };
  }, [trips]);

  const activeTrips = sections[section];

  const byDate = useMemo(() => {
    const map = new Map<string, OperatorTrip[]>();
    for (const t of activeTrips) {
      const key = colomboDateKey(t.depart_at);
      const bucket = map.get(key);
      if (bucket) bucket.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [activeTrips]);

  const tabs: { id: Section; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <div className="mt-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <CalendarRange size={18} />
        </span>
        <h2 className="font-heading text-xl font-semibold">Trips</h2>
      </div>

      <div className="ui mt-3 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              section === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="font-normal text-muted-foreground">({sections[t.id].length})</span>
          </button>
        ))}
      </div>

      {byDate.size === 0 ? (
        <div className="card mt-5 p-10 text-center text-sm text-muted-foreground">
          No {section} trips.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {[...byDate.entries()].map(([date, dayTrips]) => (
            <div key={date}>
              <p className="ui mb-2 text-sm font-semibold text-muted-foreground">{prettyDate(date)}</p>
              <Card>
                <div className="flex flex-col">
                  {dayTrips.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-0"
                    >
                      <Link href={`/operator/trips/${t.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-heading font-semibold">{t.route?.name ?? "—"}</p>
                          <span
                            className={`ui shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[t.status] ?? STATUS_STYLE.scheduled}`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <p className="ui mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users size={13} />
                          Bus {t.bus.reg_no} · <span className="capitalize">{t.bus.bus_type.class.replace(/_/g, " ")}</span> ·{" "}
                          {t.bus.bus_type.seat_count} seats
                        </p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-heading font-bold text-brand dark:text-blue-400">
                          {colomboTime(t.depart_at)}
                        </span>
                        {section === "upcoming" && (
                          <RequestCancellationButton
                            tripId={t.id}
                            cancellationRequestedAt={t.cancellation_requested_at}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
