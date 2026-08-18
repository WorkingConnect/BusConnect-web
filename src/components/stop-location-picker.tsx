"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MapPin, X } from "lucide-react";
import { loadGoogleMapsScript } from "@/lib/google-maps";

// Sri Lanka's rough center — every stop picker opens here until a
// coordinate (existing pin, pasted link, or a click) says otherwise.
const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const DEFAULT_ZOOM = 7;
const PINNED_ZOOM = 15;

/**
 * A stop's location editor: an interactive map (click or drag the pin to
 * place it) plus a "paste a Google Maps link" shortcut that resolves via the
 * backend (needed for maps.app.goo.gl short links, which only reveal
 * coordinates after their redirect) and re-centers the map to match.
 */
export function StopLocationPicker({
  stopName,
  initial,
  onResolveLink,
  onSave,
  onClose,
}: {
  stopName: string;
  initial: { lat: number; lng: number } | null;
  onResolveLink: (url: string) => Promise<{ lat: number; lng: number }>;
  onSave: (point: { lat: number; lng: number }) => Promise<void>;
  onClose: () => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(initial);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [link, setLink] = useState("");
  const [resolving, setResolving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        const center = initial ?? DEFAULT_CENTER;
        const map = new google.maps.Map(mapDivRef.current, {
          center,
          zoom: initial ? PINNED_ZOOM : DEFAULT_ZOOM,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        const marker = new google.maps.Marker({
          map,
          position: initial ?? undefined,
          draggable: true,
          visible: !!initial,
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) setPoint({ lat: pos.lat(), lng: pos.lng() });
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          marker.setVisible(true);
          setPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        mapRef.current = map;
        markerRef.current = marker;
        setMapsReady(true);
      })
      .catch((e: Error) => setMapsError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time map init
  }, []);

  function moveTo(next: { lat: number; lng: number }) {
    setPoint(next);
    mapRef.current?.panTo(next);
    mapRef.current?.setZoom(PINNED_ZOOM);
    markerRef.current?.setPosition(next);
    markerRef.current?.setVisible(true);
  }

  async function useLink() {
    if (!link.trim()) return;
    setLinkError(null);
    setResolving(true);
    try {
      const resolved = await onResolveLink(link.trim());
      moveTo(resolved);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Could not read that link.");
    } finally {
      setResolving(false);
    }
  }

  async function save() {
    if (!point) return;
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(point);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save this location.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-lg flex w-full max-w-xl flex-col p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold">
            Set location — <span className="font-normal text-slate-500 dark:text-zinc-400">{stopName}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <label className="ui mt-4 flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Paste a Google Maps link (optional shortcut)
          <div className="flex gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://maps.google.com/... or maps.app.goo.gl/..."
              className="field flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => void useLink()}
              disabled={resolving || !link.trim()}
              className="btn-secondary shrink-0 py-2 text-sm"
            >
              {resolving ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              Use link
            </button>
          </div>
        </label>
        {linkError && <p className="ui mt-1.5 text-xs text-red-600 dark:text-red-400">{linkError}</p>}

        <p className="ui mt-4 mb-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300">
          Or click the map to place the pin
        </p>
        <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
          {mapsError ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-600 dark:text-red-400">
              {mapsError}
            </div>
          ) : !mapsReady ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : null}
          <div ref={mapDivRef} className="h-full w-full" />
        </div>

        {point ? (
          <p className="ui mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span>
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand hover:underline dark:text-blue-400"
            >
              <ExternalLink size={12} /> Open in Google Maps
            </a>
          </p>
        ) : (
          <p className="ui mt-2 text-xs text-slate-500 dark:text-zinc-400">No coordinates set yet.</p>
        )}

        {saveError && <p className="ui mt-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !point} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            {saving ? "Saving…" : "Save location"}
          </button>
        </div>
      </div>
    </div>
  );
}
