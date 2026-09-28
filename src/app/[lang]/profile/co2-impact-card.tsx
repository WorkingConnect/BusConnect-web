"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateMyProfile, ApiError, type Co2Impact, type TravelMode } from "@/lib/api";
import { TRAVEL_MODE_OPTIONS } from "@/lib/travel-modes";
import { TravelModeIcon } from "@/components/travel-mode-icon";

export function Co2ImpactCard({
  impact,
  travelMode: initialTravelMode,
}: {
  impact: Co2Impact;
  travelMode: TravelMode | null;
}) {
  const router = useRouter();
  const [travelMode, setTravelMode] = useState(initialTravelMode);
  const [busy, setBusy] = useState<TravelMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(mode: TravelMode) {
    if (mode === travelMode) return;
    setError(null);
    setBusy(mode);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await updateMyProfile(session.access_token, { travelMode: mode });
      setTravelMode(mode);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save changes.");
    } finally {
      setBusy(null);
    }
  }

  if (impact.tripCount === 0) return null;

  return (
    <div className="card mt-6 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50">
          <Leaf size={18} className="text-emerald-600 dark:text-emerald-400" />
        </span>
        <div>
          <p className="font-heading text-lg font-bold tracking-tight">
            {impact.totalKg.toFixed(1)} kg CO₂ saved
          </p>
          <p className="ui text-xs text-slate-500 dark:text-zinc-500">
            Across {impact.tripCount} {impact.tripCount === 1 ? "trip" : "trips"} by bus
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="ui text-xs font-medium text-slate-600 dark:text-zinc-400">
          Your usual alternative — prefills this choice at checkout, you can still change it per trip
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TRAVEL_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={busy !== null}
              onClick={() => pick(opt.value)}
              aria-pressed={travelMode === opt.value}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                travelMode === opt.value
                  ? "border-brand bg-brand-soft text-brand dark:border-blue-400 dark:bg-brand-soft-dark dark:text-blue-300"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              <TravelModeIcon icon={opt.icon} size={16} />
              {opt.label}
            </button>
          ))}
        </div>
        {error && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
