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
 * its currently-selected road path (read-only — Google's public Polyline
 * API doesn't support live-recalculating drag editing for a dense,
 * 100+ point road-snapped line the way maps.google.com's own proprietary
 * route editor does; reshaping the path is done by adding a waypoint and
 * re-running the Directions preview instead). `path` is [lng, lat] pairs
 * (GeoJSON order), matching the preview/Directions output.
 *
 * `onMapClick` reports every map click, e.g. to drop a waypoint where
 * clicked.
 */
export function RoutePreviewMap({
  stops,
  path,
  onMapClick,
  className,
}: {
  stops: RouteMapStop[];
  path: [number, number][] | null;
  onMapClick?: (point: { lat: number; lng: number }) => void;
  /** Overrides the wrapper's default `h-80 w-full rounded-xl border` sizing —
   *  e.g. `"absolute inset-0"` to fill a fullscreen container. */
  className?: string;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

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

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

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

    if (path && path.length > 1) {
      const coords = path.map(([lng, lat]) => ({ lat, lng }));
      polylineRef.current = new google.maps.Polyline({
        map,
        path: coords,
        strokeColor: BRAND,
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });
      coords.forEach((c) => {
        bounds.extend(c);
        has = true;
      });
    }

    if (has) {
      map.fitBounds(bounds, 48);
      if (stops.length === 1 && !path) map.setZoom(15);
    }
  }, [ready, stops, path]);

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
