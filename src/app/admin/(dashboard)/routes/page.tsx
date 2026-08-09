"use client";

import { useEffect, useState, useCallback } from "react";
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
import { uploadRouteImage } from "@/lib/storage";
import { ImageSlot } from "@/components/image-slot";
import { StopLocationPicker } from "@/components/stop-location-picker";
import { RoutePreviewMap, type RouteMapStop } from "@/components/route-preview-map";
import {
  listAdminLocations,
  createAdminLocation,
  resolveMapsLink,
  listAdminRoutes,
  createAdminRoute,
  updateAdminRoute,
  deleteAdminRoute,
  regenerateAdminRoutePath,
  previewAdminRoutePath,
  ApiError,
  type AdminLocation,
  type AdminRoute,
  type RoutePathOption,
  type RouteStopInput,
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
      const [locs, routeList] = await Promise.all([
        listAdminLocations(session.access_token),
        listAdminRoutes(session.access_token),
      ]);
      setLocations(locs);
      setRoutes(routeList);
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
              setEditor({ name: "", stops: [emptyStop(), emptyStop()], path: null })
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
  editor,
  setEditor,
  onCreateLocation,
  onSaved,
}: {
  token: string;
  locations: AdminLocation[];
  editor: EditorState;
  setEditor: (e: EditorState | null) => void;
  onCreateLocation: (name: string) => Promise<AdminLocation>;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editor.imageUrl ?? null);
  const [locatingKey, setLocatingKey] = useState<string | null>(null);

  // Preview-path state
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [options, setOptions] = useState<RoutePathOption[] | null>(null);
  const [selectedOption, setSelectedOption] = useState(0);

  const stops = editor.stops;
  const setStops = (next: EditorStop[]) => setEditor({ ...editor, stops: next });

  function patchStop(key: string, patch: Partial<EditorStop>) {
    setStops(stops.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function onImageChange(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : editor.imageUrl ?? null);
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

  async function previewPath() {
    setPreviewError(null);
    const pinned = stops.filter((s) => s.lat != null && s.lng != null);
    if (pinned.length < 2) {
      setPreviewError("Pin at least two stops on the map before previewing the path.");
      return;
    }
    setPreviewing(true);
    try {
      const payload: RouteStopInput[] = stops.map((s) => ({
        locationId: s.isWaypoint ? null : s.locationId,
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
      setEditor({ ...editor, stops, path: opts[0].coordinates });
    } catch (e) {
      setPreviewError(e instanceof ApiError ? e.message : "Could not preview the path.");
    } finally {
      setPreviewing(false);
    }
  }

  function chooseOption(i: number) {
    if (!options) return;
    setSelectedOption(i);
    setEditor({ ...editor, stops, path: options[i].coordinates });
  }

  async function save() {
    setError(null);
    if (!editor.name.trim()) {
      setError("Give the route a name.");
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
      let imageUrl = editor.imageUrl;
      if (imageFile) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new ApiError(401, "Please sign in.");
        imageUrl = await uploadRouteImage(session.user.id, imageFile);
      }

      const body = {
        name: editor.name.trim(),
        stops: stops.map((s) => ({
          locationId: s.isWaypoint ? null : s.locationId,
          lat: s.lat as number,
          lng: s.lng as number,
          isWaypoint: s.isWaypoint,
        })),
        pathCoordinates: editor.path ?? undefined,
        imageUrl,
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

      <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
        Route name
        <input
          value={editor.name}
          onChange={(e) => setEditor({ ...editor, name: e.target.value })}
          placeholder="e.g. Colombo – Kandy via Kadugannawa"
          className="field text-sm"
        />
      </label>

      <div className="mt-4">
        <ImageSlot label="Route photo (optional)" preview={imagePreview} onChange={onImageChange} />
      </div>

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
          <RoutePreviewMap stops={mapStops} path={editor.path} />
          {previewError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{previewError}</p>}

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
              Road path set — it saves with the route.
            </p>
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
