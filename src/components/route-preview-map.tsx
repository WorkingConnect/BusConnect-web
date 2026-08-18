"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/google-maps";

const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const DEFAULT_ZOOM = 7;
const BRAND = "#004aad";
const WAYPOINT = "#9333ea";

export interface RouteMapStop {
  lat: number;
  lng: number;
  isWaypoint: boolean;
  label: string; // marker label ("1", "2", …) or "W" for a waypoint
}

/**
 * Draws a route's stops (numbered pins; waypoints in a distinct colour) and
 * its currently-selected road path. Used in the admin route editor so the
 * admin can see the actual road the generated path follows and spot where
 * it needs a waypoint. `path` is [lng, lat] pairs (GeoJSON order), matching
 * the preview/Directions output.
 *
 * Two optional interactive modes, both opt-in:
 * - `onMapClick` — reports every map click, e.g. to drop a waypoint where
 *   clicked.
 * - `editablePath` — turns the drawn line into a native Google Maps
 *   editable polyline (drag a vertex to move it, click a segment to insert
 *   a new one); `onPathEdited` fires with the updated coordinates. This
 *   only reshapes the visual line — it never touches `stops`. To avoid
 *   fighting an in-progress drag, a path update that matches what this
 *   component itself just emitted is recognised as a self-edit and doesn't
 *   trigger a full polyline rebuild — only a genuinely new path (a
 *   different Directions option, a re-pasted link, etc.) does.
 */
export function RoutePreviewMap({
  stops,
  path,
  onMapClick,
  editablePath,
  onPathEdited,
  className,
}: {
  stops: RouteMapStop[];
  path: [number, number][] | null;
  onMapClick?: (point: { lat: number; lng: number }) => void;
  editablePath?: boolean;
  onPathEdited?: (coordinates: [number, number][]) => void;
  /** Overrides the wrapper's default `h-80 w-full rounded-xl border` sizing —
   *  e.g. `"absolute inset-0"` to fill a fullscreen container. */
  className?: string;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const lastEmittedPathRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);
  const onPathEditedRef = useRef(onPathEdited);
  useEffect(() => {
    onPathEditedRef.current = onPathEdited;
  }, [onPathEdited]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onMapClickRef.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Redraw markers + path whenever the stops or path change.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const cleanupTimers: number[] = [];

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let has = false;

    stops.forEach((s) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: s.lat, lng: s.lng },
        label: { text: s.label, color: "#fff", fontSize: "11px", fontWeight: "600" },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: s.isWaypoint ? WAYPOINT : BRAND,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: s.lat, lng: s.lng });
      has = true;
    });

    // A path update that exactly matches what we just emitted from a drag/
    // insert is our own edit echoing back through props — leave the live
    // polyline (and any in-progress drag) alone rather than tearing it down.
    const pathKey = path ? JSON.stringify(path) : null;
    const isSelfEdit = !!editablePath && pathKey !== null && pathKey === lastEmittedPathRef.current;

    if (!isSelfEdit) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;

      if (path && path.length > 1) {
        const coords = path.map(([lng, lat]) => ({ lat, lng }));
        polylineRef.current = new google.maps.Polyline({
          map,
          path: coords,
          strokeColor: BRAND,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          editable: !!editablePath,
        });
        if (editablePath) {
          const thisPolyline = polylineRef.current;
          const mvcPath = thisPolyline.getPath();
          let lastKnownLength = mvcPath.getLength();
          const emit = () => {
            const arr = mvcPath.getArray();
            // A real drag/insert/remove changes the point count by at most
            // 1 per event — a bigger jump means something else touched the
            // array, not a genuine edit, so ignore it rather than risk
            // silently replacing a good (possibly 100+ point) path with a
            // broken one.
            if (Math.abs(arr.length - lastKnownLength) > 1) {
              lastKnownLength = arr.length;
              return;
            }
            lastKnownLength = arr.length;
            const edited = arr.map((ll): [number, number] => [ll.lng(), ll.lat()]);
            lastEmittedPathRef.current = JSON.stringify(edited);
            onPathEditedRef.current?.(edited);
          };
          // Defer attaching listeners until this polyline's own construction
          // has fully settled — Google Maps can fire internal set_at/
          // insert_at events while wiring up editable drag handles for a
          // large point count (a dense Directions-decoded path routinely
          // has 100+ points), and treating those as real user edits would
          // silently overwrite the correct path with an incomplete
          // mid-setup snapshot.
          const timer = window.setTimeout(() => {
            if (polylineRef.current !== thisPolyline) return; // redrawn before we attached
            google.maps.event.addListener(mvcPath, "insert_at", emit);
            google.maps.event.addListener(mvcPath, "set_at", emit);
            google.maps.event.addListener(mvcPath, "remove_at", emit);
          }, 0);
          cleanupTimers.push(timer);
        }
      }
    }

    if (path && path.length > 1) {
      path.forEach(([lng, lat]) => {
        bounds.extend({ lat, lng });
        has = true;
      });
    }

    if (has) {
      map.fitBounds(bounds, 48);
      if (stops.length === 1 && !path) map.setZoom(15);
    }

    return () => {
      cleanupTimers.forEach((t) => window.clearTimeout(t));
    };
  }, [ready, stops, path, editablePath]);

  return (
    <div className={className ?? "relative h-80 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800"}>
      {error ? (
        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : !ready ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : null}
      <div ref={mapDivRef} className="h-full w-full" />
    </div>
  );
}
