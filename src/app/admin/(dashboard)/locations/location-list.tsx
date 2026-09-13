"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdminLocation } from "@/lib/api";
import { VisibilityToggle } from "./visibility-toggle";

export function LocationList({ locations }: { locations: AdminLocation[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name_en.toLowerCase().includes(q) ||
        l.name_si?.includes(query.trim()) ||
        l.name_ta?.includes(query.trim()),
    );
  }, [locations, query]);

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
          placeholder="Search locations by name…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            {locations.length === 0 ? "No locations created yet." : `No locations match "${query}".`}
          </div>
        ) : (
          filtered.map((l) => <LocationRow key={l.id} location={l} />)
        )}
      </div>
    </div>
  );
}

function LocationRow({ location: l }: { location: AdminLocation }) {
  const names = [l.name_en, l.name_si, l.name_ta].filter(Boolean).join(" · ");

  return (
    <div className="card card-hover flex items-start justify-between gap-4 p-4">
      <div>
        <p className="font-medium">{names}</p>
        <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
          {l.lat !== null && l.lng !== null ? `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}` : "No pin set"}
        </p>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          {l.route_count === 0
            ? "Not on any route yet"
            : `Used on ${l.route_count} route${l.route_count === 1 ? "" : "s"}`}
        </p>
      </div>
      <VisibilityToggle locationId={l.id} isPublic={l.is_public} />
    </div>
  );
}
