"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MapPin, Route as RouteIcon, Search } from "lucide-react";
import type { AdminLocation, AdminRoute } from "@/lib/api";
import { VisibilityToggle } from "./visibility-toggle";
import { DeleteLocationButton } from "./delete-location-button";

interface LocationGroup {
  key: string;
  label: string;
  imageUrl: string | null;
  locations: AdminLocation[];
}

function matchesQuery(l: AdminLocation, q: string) {
  return (
    l.name_en.toLowerCase().includes(q) ||
    Boolean(l.name_si?.toLowerCase().includes(q)) ||
    Boolean(l.name_ta?.toLowerCase().includes(q))
  );
}

export function LocationList({ locations, routes }: { locations: AdminLocation[]; routes: AdminRoute[] }) {
  const [query, setQuery] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const groups = useMemo<LocationGroup[]>(() => {
    const byId = new Map(locations.map((l) => [l.id, l]));
    const usedIds = new Set<string>();

    const byRoute = routes
      .map((r) => {
        const stopLocations = r.stops
          .filter((s) => !s.is_waypoint && s.location_id)
          .map((s) => byId.get(s.location_id as string))
          .filter((l): l is AdminLocation => Boolean(l));
        stopLocations.forEach((l) => usedIds.add(l.id));
        return { key: r.id, label: r.name, imageUrl: r.image_url, locations: stopLocations };
      })
      .filter((g) => g.locations.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    const unassigned = locations.filter((l) => !usedIds.has(l.id));
    if (unassigned.length > 0) {
      byRoute.push({ key: "__unassigned", label: "Not on any route", imageUrl: null, locations: unassigned });
    }
    return byRoute;
  }, [locations, routes]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const visibleGroups = useMemo(() => {
    if (!searching) return groups;
    return groups
      .map((g) => ({ ...g, locations: g.locations.filter((l) => matchesQuery(l, q)) }))
      .filter((g) => g.locations.length > 0);
  }, [groups, searching, q]);

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
        {locations.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No locations created yet.
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No locations match &quot;{query}&quot;.
          </div>
        ) : (
          visibleGroups.map((g) => {
            const open = searching || openKeys.has(g.key);
            return (
              <div key={g.key} className="card overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  className="ui flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.imageUrl}
                      alt={`${g.label} photo`}
                      className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                      {g.key === "__unassigned" ? <MapPin size={18} /> : <RouteIcon size={18} />}
                    </div>
                  )}
                  <span className="flex-1 font-medium">{g.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="ui text-xs text-slate-400 dark:text-zinc-500">
                      {g.locations.length} location{g.locations.length === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform dark:text-zinc-500 ${open ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {open && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 p-2.5 dark:border-zinc-800">
                    {g.locations.map((l) => (
                      <LocationRow key={l.id} location={l} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
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
      <div className="flex items-center gap-1.5">
        <VisibilityToggle locationId={l.id} isPublic={l.is_public} />
        <DeleteLocationButton locationId={l.id} locationName={names} />
      </div>
    </div>
  );
}
