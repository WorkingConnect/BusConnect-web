"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createHold, createBooking, ApiError, type SeatLayout, type SeatState, type TripStopTime } from "@/lib/api";
import { layoutToGrid } from "@/lib/seat-layout";

interface Props {
  tripId: string;
  layout: SeatLayout | null;
  seatCount: number;
  initialSeats: SeatState[];
  farePerSeat: number;
  fromStopId: string;
  toStopId: string;
  stops: TripStopTime[];
}

const SEAT_STYLE: Record<string, string> = {
  available:
    "border border-slate-300 bg-white text-slate-700 hover:border-brand hover:text-brand dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  selected: "bg-emerald-600 text-white",
  male: "cursor-not-allowed bg-blue-600 text-white",
  female: "cursor-not-allowed bg-pink-500 text-white",
  pending: "cursor-not-allowed bg-yellow-500 text-white",
  blocked: "cursor-not-allowed bg-gray-500 text-white dark:bg-gray-600",
};

export function SeatSelector(props: Props) {
  const { tripId, seatCount, farePerSeat, fromStopId, toStopId, stops } = props;
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const boardableStops = useMemo(() => stops.filter((s) => s.can_board), [stops]);
  const droppableStops = useMemo(() => stops.filter((s) => s.can_drop), [stops]);
  const fromSeq = stops.find((s) => s.route_stop_id === fromStopId)?.seq ?? -Infinity;
  const toSeq = stops.find((s) => s.route_stop_id === toStopId)?.seq ?? Infinity;

  function changeStop(which: "from" | "to", routeStopId: string) {
    const params = new URLSearchParams({
      from: which === "from" ? routeStopId : fromStopId,
      to: which === "to" ? routeStopId : toStopId,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const grid = useMemo(() => layoutToGrid(props.layout, seatCount), [props.layout, seatCount]);
  const [seatStates, setSeatStates] = useState<Map<string, SeatState>>(
    () => new Map(props.initialSeats.map((s) => [s.seat_no, s])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [genders, setGenders] = useState<Map<string, "male" | "female">>(new Map());
  const [genderPromptSeat, setGenderPromptSeat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Pull the current per-seat status straight from Supabase (public read).
  const refreshSeats = useCallback(async () => {
    const { data } = await supabase
      .from("seat_holds")
      .select("seat_no, status, gender, expires_at")
      .eq("trip_id", tripId);
    if (!data) return;
    const now = Date.now();
    const next = new Map<string, SeatState>();
    for (const h of data) {
      const active =
        h.status === "booked" ||
        h.status === "blocked" ||
        (h.status === "held" && new Date(h.expires_at).getTime() > now);
      if (active) {
        next.set(h.seat_no, {
          seat_no: h.seat_no,
          status: h.status === "held" ? "held" : (h.status as "booked" | "blocked"),
          gender: (h.gender as "male" | "female" | null) ?? null,
        });
      }
    }
    setSeatStates(next);
  }, [supabase, tripId]);

  // Live seat updates: anyone holding/booking/blocking/releasing a seat on this trip.
  useEffect(() => {
    const channel = supabase
      .channel(`seat_holds:${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seat_holds", filter: `trip_id=eq.${tripId}` },
        () => void refreshSeats(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, tripId, refreshSeats]);

  // Dismiss the gender popover on an outside click.
  useEffect(() => {
    if (!genderPromptSeat) return;
    function onClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setGenderPromptSeat(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [genderPromptSeat]);

  function seatKind(label: string): "available" | "selected" | "male" | "female" | "pending" | "blocked" {
    if (selected.has(label)) return "selected";
    const state = seatStates.get(label);
    if (!state) return "available";
    if (state.status === "blocked") return "blocked";
    if (state.status === "held") return "pending";
    return state.gender === "female" ? "female" : "male";
  }

  function toggle(label: string) {
    if (seatStates.has(label)) return; // taken (held/booked/blocked) — not clickable
    if (selected.has(label)) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(label);
        return next;
      });
      setGenders((prev) => {
        const next = new Map(prev);
        next.delete(label);
        return next;
      });
      setGenderPromptSeat(null);
      return;
    }
    setGenderPromptSeat(label);
  }

  function pickGender(label: string, gender: "male" | "female") {
    setSelected((prev) => new Set(prev).add(label));
    setGenders((prev) => new Map(prev).set(label, gender));
    setGenderPromptSeat(null);
  }

  async function handleContinue() {
    setError(null);
    if (selected.size === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/login?next=/trips/${tripId}`);
      return;
    }

    setBusy(true);
    try {
      const hold = await createHold(session.access_token, {
        tripId,
        seats: [...selected].map((seatNo) => ({ seatNo, gender: genders.get(seatNo) })),
      });
      const booking = await createBooking(session.access_token, {
        holdGroup: hold.hold_group,
        fromStopId,
        toStopId,
      });
      router.push(`/bookings/${booking.booking_id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("Some of those seats were just taken. Please pick again.");
        setSelected(new Set());
        setGenders(new Map());
        void refreshSeats();
      } else {
        setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const total = selected.size * farePerSeat;

  return (
    <div>
      <div className="card p-5 sm:p-6">
        <div className="ui mb-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-slate-300 dark:border-zinc-600" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-emerald-600" />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-blue-600" />
            Booked (Male)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-pink-500" />
            Booked (Female)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-yellow-500" />
            Pending (Reserved)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-gray-500 dark:bg-gray-600" />
            Unavailable
          </span>
        </div>

        <p className="ui mb-2 text-center text-[11px] font-bold tracking-wide text-slate-400 dark:text-zinc-500">
          FRONT OF BUS
        </p>

        <div className="flex flex-col items-center gap-2">
          {grid.map((row, r) => (
            <div key={r} className="flex items-center gap-2">
              {row.map((label, ci) => {
                if (label === null) return <span key={ci} className="w-6" aria-hidden />;
                const kind = seatKind(label);
                const isTaken = kind !== "available" && kind !== "selected";
                return (
                  <div key={ci} className="relative">
                    <button
                      type="button"
                      disabled={isTaken || busy}
                      onClick={() => toggle(label)}
                      aria-pressed={kind === "selected"}
                      className={[
                        "ui h-9 w-9 rounded-lg text-xs font-medium transition-colors duration-200",
                        SEAT_STYLE[kind],
                      ].join(" ")}
                    >
                      {label}
                    </button>
                    {genderPromptSeat === label && (
                      <div
                        ref={popoverRef}
                        className="absolute left-1/2 top-full z-20 mt-2 flex -translate-x-1/2 gap-2 rounded-xl border border-border bg-card p-2 shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => pickGender(label, "male")}
                          className="ui rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-600 hover:text-white dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => pickGender(label, "female")}
                          className="ui rounded-lg border border-pink-500 px-3 py-1.5 text-xs font-semibold text-pink-500 hover:bg-pink-500 hover:text-white dark:text-pink-400 dark:hover:bg-pink-500 dark:hover:text-white"
                        >
                          Female
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {stops.length > 0 && (
        <div className="card mt-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
            Boarding point
            <select
              value={fromStopId}
              onChange={(e) => changeStop("from", e.target.value)}
              className="field py-2 text-sm"
            >
              {boardableStops.map((s) => (
                <option key={s.route_stop_id} value={s.route_stop_id} disabled={s.seq >= toSeq}>
                  {s.location_name}
                </option>
              ))}
            </select>
          </label>
          <label className="ui flex flex-col gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400">
            Drop-off point
            <select
              value={toStopId}
              onChange={(e) => changeStop("to", e.target.value)}
              className="field py-2 text-sm"
            >
              {droppableStops.map((s) => (
                <option key={s.route_stop_id} value={s.route_stop_id} disabled={s.seq <= fromSeq}>
                  {s.location_name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {/* sticky action bar */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="ui pl-2 text-sm">
          {selected.size > 0 ? (
            <>
              <span className="font-semibold">{[...selected].join(", ")}</span>
              <span className="text-slate-400"> · </span>
              <span className="font-heading font-bold text-brand dark:text-blue-400">
                LKR {total.toLocaleString("en-LK")}
              </span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-zinc-400">No seats selected</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selected.size === 0 || busy}
          className="btn-primary"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Holding…
            </>
          ) : (
            <>
              Continue <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
