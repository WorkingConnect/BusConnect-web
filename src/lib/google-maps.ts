let mapsScriptPromise: Promise<void> | null = null;

/** Loads the Google Maps JS SDK once per page, however many maps/pickers use it. */
export function loadGoogleMapsScript(): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("Google Maps isn't configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset)."));
      return;
    }
    if (typeof window !== "undefined" && (window as unknown as { google?: unknown }).google) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Maps."));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}
