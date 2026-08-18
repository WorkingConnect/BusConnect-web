"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Plus,
  PlusCircle,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Trash2,
  Waypoints,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StopLocationPicker } from "@/components/stop-location-picker";
import { RoutePreviewMap, type RouteMapStop } from "@/components/route-preview-map";
import {
  listAdminLocations,
  createAdminLocation,
  resolveMapsLink,
  resolveAdminRouteLink,
  listAdminRoutes,
  createAdminRoute,
  updateAdminRoute,
  deleteAdminRoute,
  regenerateAdminRoutePath,
  previewAdminRoutePath,
  listCandidateTripsForPath,
  previewPathFromTrip,
  listAdminRouteCards,
  ApiError,
  type AdminLocation,
  type AdminRoute,
  type AdminRouteCard,
  type RoutePathOption,
  type PreviewStopInput,
  type RouteTripCandidate,
} from "@/lib/api";

let stopKeySeq = 0;
const nextKey = () => `stop-${stopKeySeq++}`;

interface EditorStop {
  key: string; // stable React key
  locationId: string | null; // null for a hidden waypoint
  name: string | null; // display name (null for a waypoint)
  lat: number | null;
  lng: number | null;
  isWaypoint: boolean;
}

interface EditorState {
  id?: string;
  name: string;
  imageUrl?: string;
  routeCardId: string | null;
  stops: EditorStop[];
  path: [number, number][] | null; // [lng,lat] chosen/saved road path
}

function emptyStop(): EditorStop {
  return { key: nextKey(), locationId: null, name: null, lat: null, lng: null, isWaypoint: false };
}

function editorFromRoute(r: AdminRoute): EditorState {
  return {
    id: r.id,
    name: r.name,
    imageUrl: r.image_url ?? undefined,
    routeCardId: r.route_card_id,
    stops: r.stops.map((s) => ({
      key: nextKey(),
      locationId: s.location_id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      isWaypoint: s.is_waypoint,
    })),
    path: r.path?.coordinates ?? null,
  };
}

export default function AdminRoutesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [routeCards, setRouteCards] = useState<AdminRouteCard[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setToken(session.access_token);
      const [locs, routeList, cardList] = await Promise.all([
        listAdminLocations(session.access_token),
        listAdminRoutes(session.access_token),
        listAdminRouteCards(session.access_token),
      ]);
      setLocations(locs);
      setRoutes(routeList);
      setRouteCards(cardList);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 403
            ? "Your account does not have admin access."
            : e.message
          : "Could not reach BusConnect-api. Is it running?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function createLocation(name: string): Promise<AdminLocation> {
    if (!token) throw new Error("Not signed in");
    const loc = await createAdminLocation(token, { nameEn: name });
    setLocations((prev) =>
      prev.some((l) => l.id === loc.id) ? prev : [...prev, loc].sort((a, b) => a.name_en.localeCompare(b.name_en)),
    );
    return loc;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading routes…
      </div>
    );
  }
  if (error || !token) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Routes</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Shared route catalog — each route is an ordered list of stops from origin to
            destination. Any operator can run a journey on any route.
          </p>
        </div>
        {!editor && (
          <button
            type="button"
            onClick={() =>
              setEditor({ name: "", routeCardId: null, stops: [emptyStop(), emptyStop()], path: null })
            }
            className="btn-primary shrink-0"
          >
            <PlusCircle size={16} /> New route
          </button>
        )}
      </div>

      {editor && (
        <RouteEditor
          token={token}
          locations={locations}
          routeCards={routeCards}
          editor={editor}
          setEditor={setEditor}
          onCreateLocation={createLocation}
          onSaved={() => {
            setEditor(null);
            void loadAll();
          }}
        />
      )}

      <div className="mt-6 flex flex-col gap-2">
        {routes.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            No routes yet.
          </div>
        ) : (
          routes.map((r) => {
            const visible = r.stops.filter((s) => !s.is_waypoint);
            const waypointCount = r.stops.length - visible.length;
            return (
              <div key={r.id} className="card flex items-center gap-3 p-4">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt={`${r.name} photo`}
                    className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                    <RouteIcon size={18} />
                  </div>
                )}
                <div className="flex flex-1 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name}</p>
                    <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
                      {visible.map((s) => s.name ?? "—").join("  →  ")}
                    </p>
                    <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">
                      {visible.length} stops
                      {waypointCount > 0 && ` · ${waypointCount} hidden waypoint${waypointCount > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <RegeneratePathButton token={token} routeId={r.id} onDone={loadAll} />
                    <button
                      type="button"
                      onClick={() => setEditor(editorFromRoute(r))}
                      className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </button>
                    <DeleteRouteButton token={token} routeId={r.id} routeName={r.name} onDeleted={loadAll} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RouteEditor({
  token,
  locations,
  routeCards,
  editor,
  setEditor,
  onCreateLocation,
  onSaved,
}: {
  token: string;
  locations: AdminLocation[];
  routeCards: AdminRouteCard[];
  editor: EditorState;
  setEditor: (e: EditorState | null) => void;
  onCreateLocation: (name: string) => Promise<AdminLocation>;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locatingKey, setLocatingKey] = useState<string | null>(null);

  // Paste-a-route-link state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Click-map-to-add-a-waypoint state
  const [waypointClickMode, setWaypointClickMode] = useState(false);

  // Preview-path state
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [options, setOptions] = useState<RoutePathOption[] | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);

  // Optional: use a real recorded trip's GPS trace as the path instead.
  const [tripSectionOpen, setTripSectionOpen] = useState(false);
  const [candidateTrips, setCandidateTrips] = useState<RouteTripCandidate[] | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripPathBusy, setTripPathBusy] = useState<string | null>(null); // tripId in flight
  const [tripPathError, setTripPathError] = useState<string | null>(null);
  const [usedTripId, setUsedTripId] = useState<string | null>(null);

  const stops = editor.stops;
  const setStops = (next: EditorStop[]) => setEditor({ ...editor, stops: next });

  function patchStop(key: string, patch: Partial<EditorStop>) {
    setStops(stops.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function selectCard(cardId: string) {
    const card = routeCards.find((c) => c.id === cardId);
    if (!card) return;
    setEditor({ ...editor, routeCardId: card.id, name: card.name, imageUrl: card.image_url ?? undefined });
  }

  function selectLocation(key: string, loc: AdminLocation) {
    // Prefill the stop's pin from the location's default the first time.
    setStops(
      stops.map((s) =>
        s.key === key
          ? {
              ...s,
              locationId: loc.id,
              name: loc.name_en,
              lat: s.lat ?? loc.lat,
              lng: s.lng ?? loc.lng,
            }
          : s,
      ),
    );
  }

  function addStop() {
    setStops([...stops, emptyStop()]);
  }
  function addWaypoint() {
    setStops([...stops, { ...emptyStop(), isWaypoint: true }]);
  }
  function removeStop(key: string) {
    setStops(stops.filter((s) => s.key !== key));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    setStops(next);
  }
  function toggleWaypoint(key: string) {
    const s = stops.find((x) => x.key === key);
    if (!s) return;
    // Turning a real stop into a waypoint drops its name; turning a waypoint
    // back needs the admin to pick a location again.
    patchStop(key, { isWaypoint: !s.isWaypoint });
  }

  const mapStops: RouteMapStop[] = stops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s, i) => ({
      lat: s.lat as number,
      lng: s.lng as number,
      isWaypoint: s.isWaypoint,
      label: s.isWaypoint ? "W" : String(i + 1),
    }));

  // Takes an explicit stop list (rather than always reading the `stops`
  // closure) so a freshly-parsed route link can trigger a preview
  // immediately, without waiting a render for state to catch up.
  async function previewPathFor(pinnedStops: EditorStop[]) {
    setPreviewError(null);
    const pinned = pinnedStops.filter((s) => s.lat != null && s.lng != null);
    if (pinned.length < 2) {
      setPreviewError("Pin at least two stops on the map before previewing the path.");
      return;
    }
    setPreviewing(true);
    try {
      const payload: PreviewStopInput[] = pinnedStops.map((s) => ({
        lat: s.lat as number,
        lng: s.lng as number,
        isWaypoint: s.isWaypoint,
      }));
      const { options: opts } = await previewAdminRoutePath(token, payload);
      if (!opts.length) {
        setPreviewError("Directions returned no path for these stops. Check the API key/quota.");
        setPreviewing(false);
        return;
      }
      setOptions(opts);
      setSelectedOption(0);
      setUsedTripId(null);
      setEditor({ ...editor, stops: pinnedStops, path: opts[0].coordinates });
    } catch (e) {
      setPreviewError(e instanceof ApiError ? e.message : "Could not preview the path.");
    } finally {
      setPreviewing(false);
    }
  }

  async function previewPath() {
    await previewPathFor(stops);
  }

  async function loadRouteLink() {
    setLinkError(null);
    const url = linkUrl.trim();
    if (!url) return;
    setLinkBusy(true);
    try {
      const points = await resolveAdminRouteLink(token, url);
      const newStops: EditorStop[] = points.map((p) => {
        // Best-effort match to an existing Location by name, so a resolved
        // place doesn't need re-searching — falls through to unresolved
        // (locationId null) when nothing matches; the admin then searches/
        // adds it via the stop picker same as any manually-added stop.
        const match = p.label
          ? locations.find(
              (l) =>
                l.name_en.toLowerCase() === p.label!.toLowerCase() ||
                p.label!.toLowerCase().startsWith(l.name_en.toLowerCase()),
            )
          : undefined;
        return {
          key: nextKey(),
          locationId: match?.id ?? null,
          name: match?.name_en ?? p.label,
          lat: p.lat,
          lng: p.lng,
          isWaypoint: false,
        };
      });
      setEditor({ ...editor, stops: newStops, path: null });
      setOptions(null);
      setUsedTripId(null);
      setLinkUrl("");
      await previewPathFor(newStops);
    } catch (e) {
      setLinkError(e instanceof ApiError ? e.message : "Could not load that route link.");
    } finally {
      setLinkBusy(false);
    }
  }

  function handleMapClick(point: { lat: number; lng: number }) {
    if (!waypointClickMode) return;
    setStops([...stops, { key: nextKey(), locationId: null, name: null, lat: point.lat, lng: point.lng, isWaypoint: true }]);
    setWaypointClickMode(false);
  }

  function chooseOption(i: number) {
    if (!options) return;
    setSelectedOption(i);
    setUsedTripId(null);
    setEditor({ ...editor, stops, path: options[i].coordinates });
  }

  async function openTripSection() {
    setTripSectionOpen((v) => !v);
    if (candidateTrips || !editor.id) return;
    setLoadingTrips(true);
    try {
      setCandidateTrips(await listCandidateTripsForPath(token, editor.id));
    } catch (e) {
      setTripPathError(e instanceof ApiError ? e.message : "Could not load trips for this route.");
    } finally {
      setLoadingTrips(false);
    }
  }

  async function applyTripPath(tripId: string) {
    if (!editor.id) return;
    setTripPathError(null);
    setTripPathBusy(tripId);
    try {
      const { coordinates } = await previewPathFromTrip(token, editor.id, tripId);
      setOptions(null);
      setUsedTripId(tripId);
      setEditor({ ...editor, stops, path: coordinates });
    } catch (e) {
      setTripPathError(e instanceof ApiError ? e.message : "Could not snap that trip's GPS trace to roads.");
    } finally {
      setTripPathBusy(null);
    }
  }

  async function save() {
    setError(null);
    if (!editor.routeCardId) {
      setError("Choose a route card.");
      return;
    }
    if (stops.length < 2) {
      setError("A route needs at least an origin and a destination stop.");
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (first.isWaypoint || last.isWaypoint) {
      setError("The first and last stops must be real stops, not hidden waypoints.");
      return;
    }
    for (const s of stops) {
      if (!s.isWaypoint && !s.locationId) {
        setError("Every real stop needs a location — search and pick one, or mark it as a waypoint.");
        return;
      }
      if (s.lat == null || s.lng == null) {
        setError(`Pin every stop on the map first — “${s.name ?? "waypoint"}” has no location set.`);
        return;
      }
    }
    const realIds = stops.filter((s) => !s.isWaypoint).map((s) => s.locationId);
    if (new Set(realIds).size !== realIds.length) {
      setError("The same stop appears more than once.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        name: editor.name.trim(),
        stops: stops.map((s) => ({
          locationId: s.isWaypoint ? null : s.locationId,
          lat: s.lat as number,
          lng: s.lng as number,
          isWaypoint: s.isWaypoint,
        })),
        pathCoordinates: editor.path ?? undefined,
        imageUrl: editor.imageUrl,
        routeCardId: editor.routeCardId,
      };
      if (editor.id) await updateAdminRoute(token, editor.id, body);
      else await createAdminRoute(token, body);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the route.");
      setBusy(false);
    }
  }

  return (
    <div className="card-lg mt-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{editor.id ? "Edit route" : "New route"}</h2>
        <button
          type="button"
          onClick={() => setEditor(null)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="ui mt-4 rounded-xl border border-dashed border-slate-300 p-3 dark:border-zinc-700">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Start from a Google Maps route (optional)
          <span className="font-normal text-slate-400 dark:text-zinc-500">
            Plan the route in Google Maps, copy its share link, and paste it here — stops and the
            road path fill in automatically. You can still add stops, mark waypoints, and adjust
            the drawn line afterward.
          </span>
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadRouteLink();
              }
            }}
            placeholder="Paste a Google Maps directions link…"
            className="field flex-1 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadRouteLink()}
            disabled={linkBusy || !linkUrl.trim()}
            className="btn-secondary shrink-0 py-2 text-sm"
          >
            {linkBusy ? <Loader2 size={15} className="animate-spin" /> : <RouteIcon size={15} />}
            Load route
          </button>
        </div>
        {linkError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{linkError}</p>}
      </div>

      <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Route card{" "}
        <span className="font-normal text-slate-400 dark:text-zinc-500">
          — sets this route&rsquo;s name and photo, kept in sync with the card. No route card yet?{" "}
          <Link href="/admin/route-cards" className="text-brand hover:underline dark:text-blue-400">
            Create one first
          </Link>
          .
        </span>
        <select
          value={editor.routeCardId ?? ""}
          onChange={(e) => selectCard(e.target.value)}
          className="field text-sm"
        >
          <option value="" disabled>
            Select a route card…
          </option>
          {routeCards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {editor.routeCardId && (
        <div className="ui mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          {editor.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={editor.imageUrl}
              alt={`${editor.name} photo`}
              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
              <RouteIcon size={16} />
            </div>
          )}
          <p className="text-sm font-medium">{editor.name}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ── Stop list ─────────────────────────────────────────────── */}
        <div>
          <p className="ui mb-2 text-sm font-medium text-slate-700 dark:text-zinc-300">
            Stops{" "}
            <span className="font-normal text-slate-400 dark:text-zinc-500">
              (origin first → destination last)
            </span>
          </p>
          <div className="flex flex-col gap-2">
            {stops.map((s, i) => {
              const isEndpoint = i === 0 || i === stops.length - 1;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className={`ui w-6 shrink-0 text-center text-xs font-semibold ${
                      s.isWaypoint ? "text-purple-500" : "text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    {s.isWaypoint ? "W" : i + 1}
                  </span>

                  {s.isWaypoint ? (
                    <span className="ui flex-1 rounded-lg border border-dashed border-purple-300 bg-purple-50/50 px-3 py-2 text-sm text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-300">
                      {s.lat != null && s.lng != null
                        ? `Hidden waypoint · ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`
                        : "Hidden waypoint · pin it on the map →"}
                    </span>
                  ) : (
                    <StopPicker
                      locations={locations}
                      valueId={s.locationId}
                      onSelect={(loc) => selectLocation(s.key, loc)}
                      onCreate={onCreateLocation}
                    />
                  )}

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setLocatingKey(s.key)}
                      disabled={!s.isWaypoint && !s.locationId}
                      className={`rounded-md p-1.5 disabled:opacity-30 ${
                        s.lat != null
                          ? "text-brand hover:bg-brand-soft dark:text-blue-400"
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      }`}
                      aria-label="Set location on map"
                      title={s.lat != null ? "Pinned — click to move" : "Set location on map"}
                    >
                      <MapPin size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWaypoint(s.key)}
                      disabled={isEndpoint}
                      className={`rounded-md p-1.5 disabled:opacity-20 ${
                        s.isWaypoint
                          ? "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      }`}
                      aria-label={s.isWaypoint ? "Make a visible stop" : "Make a hidden waypoint"}
                      title={
                        isEndpoint
                          ? "Origin and destination can't be waypoints"
                          : s.isWaypoint
                            ? "Hidden from passengers — click to make it a visible stop"
                            : "Visible to passengers — click to make it a hidden shaping waypoint"
                      }
                    >
                      {s.isWaypoint ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === stops.length - 1}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStop(s.key)}
                      disabled={stops.length <= 2}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                      aria-label="Remove stop"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={addStop} className="btn-secondary py-2 text-sm">
              <Plus size={15} /> Add stop
            </button>
            <button type="button" onClick={addWaypoint} className="btn-secondary py-2 text-sm">
              <Waypoints size={15} /> Add waypoint
            </button>
          </div>
          <p className="ui mt-2 text-xs text-slate-400 dark:text-zinc-500">
            A hidden waypoint bends the road path onto the correct road but is never shown to
            passengers — use it when the generated path takes a wrong turn.
          </p>
        </div>

        {/* ── Map + path preview ────────────────────────────────────── */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="ui text-sm font-medium text-slate-700 dark:text-zinc-300">Route map</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setWaypointClickMode((v) => !v)}
                className={`ui inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  waypointClickMode
                    ? "border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <Waypoints size={13} />
                {waypointClickMode ? "Click the map…" : "Add waypoint on map"}
              </button>
              <button
                type="button"
                onClick={() => void previewPath()}
                disabled={previewing}
                className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {previewing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Preview path
              </button>
            </div>
          </div>
          <RoutePreviewMap
            stops={mapStops}
            path={editor.path}
            onMapClick={handleMapClick}
            editablePath
            onPathEdited={(coordinates) => setEditor({ ...editor, path: coordinates })}
          />
          {waypointClickMode && (
            <p className="ui mt-2 text-xs text-purple-600 dark:text-purple-400">
              Click anywhere on the map to drop a hidden waypoint there.
            </p>
          )}
          {previewError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{previewError}</p>}
          <p className="ui mt-2 text-xs text-slate-400 dark:text-zinc-500">
            Drag a point on the drawn line to reshape it, or click along the line to add a bend —
            this only adjusts the drawn road path, not the stop list.
          </p>

          {options && options.length > 1 && (
            <div className="mt-3">
              <p className="ui mb-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
                Google offered {options.length} routes — pick the one that matches the real road:
              </p>
              <div className="flex flex-col gap-1.5">
                {options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => chooseOption(i)}
                    className={`ui flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                      i === selectedOption
                        ? "border-brand bg-brand-soft text-brand dark:border-blue-500 dark:bg-brand-soft-dark dark:text-blue-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="font-medium">{o.summary || `Route ${i + 1}`}</span>
                    <span>
                      {(o.distanceM / 1000).toFixed(1)} km · {Math.round(o.durationS / 60)} min
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {editor.path && (
            <p className="ui mt-2 text-xs text-slate-400 dark:text-zinc-500">
              {usedTripId
                ? "Using a real recorded trip's driven path — it saves with the route."
                : "Road path set — it saves with the route."}
            </p>
          )}

          {editor.id && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => void openTripSection()}
                className="ui flex w-full items-center justify-between text-left text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <span>Optional: use a real recorded trip&rsquo;s driven path instead</span>
                <ArrowDown
                  size={13}
                  className={`shrink-0 transition-transform ${tripSectionOpen ? "rotate-180" : ""}`}
                />
              </button>
              {tripSectionOpen && (
                <div className="mt-2">
                  <p className="ui mb-2 text-xs text-slate-400 dark:text-zinc-500">
                    If a bus has actually run this route with live tracking on, its recorded GPS
                    trace can become the route&rsquo;s official path (snapped to roads) — more
                    accurate than a Directions guess since it&rsquo;s the exact road the bus took.
                  </p>
                  {loadingTrips ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
                      <Loader2 size={13} className="animate-spin" /> Loading trips…
                    </div>
                  ) : !candidateTrips?.length ? (
                    <p className="ui text-xs text-slate-400 dark:text-zinc-500">
                      No trips on this route have a recorded GPS trace yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {candidateTrips.map((t) => (
                        <div
                          key={t.trip_id}
                          className={`ui flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                            usedTripId === t.trip_id
                              ? "border-brand bg-brand-soft text-brand dark:border-blue-500 dark:bg-brand-soft-dark dark:text-blue-300"
                              : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <span>
                            {new Date(t.depart_at).toLocaleDateString()} · {t.operator_name} ·{" "}
                            {t.bus_reg_no} · {(t.distance_m / 1000).toFixed(1)} km · {t.gps_points} pts
                          </span>
                          <button
                            type="button"
                            onClick={() => void applyTripPath(t.trip_id)}
                            disabled={tripPathBusy === t.trip_id}
                            className="ui shrink-0 font-semibold text-brand hover:underline disabled:opacity-60 dark:text-blue-400"
                          >
                            {tripPathBusy === t.trip_id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : usedTripId === t.trip_id ? (
                              "Using this"
                            ) : (
                              "Use this trip"
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {tripPathError && (
                    <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{tripPathError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setEditor(null)} disabled={busy} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {busy ? "Saving…" : "Save route"}
        </button>
      </div>

      {locatingKey && (
        <StopLocationPicker
          stopName={stops.find((s) => s.key === locatingKey)?.name ?? "Waypoint"}
          initial={(() => {
            const s = stops.find((x) => x.key === locatingKey);
            return s?.lat != null && s?.lng != null ? { lat: s.lat, lng: s.lng } : null;
          })()}
          onResolveLink={(url) => resolveMapsLink(token, url)}
          onSave={async (point) => {
            patchStop(locatingKey, { lat: point.lat, lng: point.lng });
          }}
          onClose={() => setLocatingKey(null)}
        />
      )}
    </div>
  );
}

function RegeneratePathButton({
  token,
  routeId,
  onDone,
}: {
  token: string;
  routeId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setBusy(true);
    try {
      await regenerateAdminRoutePath(token, routeId);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not fetch a road path.");
      setBusy(false);
    }
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        title="Re-fetch the real road path from this route's stops"
        className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
      </button>
      {error && (
        <span className="ui absolute top-full right-0 z-10 mt-1 w-48 whitespace-normal rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 shadow-lg dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </span>
      )}
    </span>
  );
}

function StopPicker({
  locations,
  valueId,
  onSelect,
  onCreate,
}: {
  locations: AdminLocation[];
  valueId: string | null;
  onSelect: (loc: AdminLocation) => void;
  onCreate: (name: string) => Promise<AdminLocation>;
}) {
  const selected = locations.find((l) => l.id === valueId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = q ? locations.filter((l) => l.name_en.toLowerCase().includes(q)) : locations;
  const exact = locations.some((l) => l.name_en.toLowerCase() === q);

  async function create() {
    setCreating(true);
    try {
      const loc = await onCreate(query.trim());
      onSelect(loc);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative flex-1">
      <input
        value={open ? query : selected?.name_en ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or add a stop…"
        className="field text-sm"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {matches.map((l) => (
            <button
              key={l.id}
              type="button"
              onMouseDown={() => {
                onSelect(l);
                setOpen(false);
              }}
              className="ui block w-full rounded-lg px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {l.name_en}
            </button>
          ))}
          {q && !exact && (
            <button
              type="button"
              disabled={creating}
              onMouseDown={(e) => {
                e.preventDefault();
                void create();
              }}
              className="ui block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-brand hover:bg-brand-soft disabled:opacity-60 dark:text-blue-400 dark:hover:bg-brand-soft-dark"
            >
              {creating ? "Adding…" : `+ Add “${query.trim()}” as a new stop`}
            </button>
          )}
          {matches.length === 0 && !q && (
            <p className="ui px-3 py-2 text-xs text-slate-400 dark:text-zinc-500">
              No stops yet — type a name to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteRouteButton({
  token,
  routeId,
  routeName,
  onDeleted,
}: {
  token: string;
  routeId: string;
  routeName: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setError(null);
    setBusy(true);
    try {
      await deleteAdminRoute(token, routeId);
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete route.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        <Trash2 size={13} /> Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && <span className="ui whitespace-nowrap text-xs text-red-600 dark:text-red-400">{error}</span>}
      <span className="ui whitespace-nowrap text-xs text-slate-600 dark:text-zinc-400">Delete {routeName}?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="ui rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirm
      </button>
    </div>
  );
}
