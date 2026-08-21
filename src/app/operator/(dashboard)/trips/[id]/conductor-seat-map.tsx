"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  blockSeat,
  unblockSeat,
  assignSeat,
  ApiError,
  type SeatLayout,
  type SeatState,
  type OperatorManifestBooking,
  type OperatorManifestStop,
} from "@/lib/api";
import { layoutToGrid } from "@/lib/seat-layout";

interface Props {
  tripId: string;
  layout: SeatLayout | null;
  seatCount: number;
  initialSeats: SeatState[];
  bookings: OperatorManifestBooking[];
  stops: OperatorManifestStop[];
  canAssignWalkup: boolean;
  onOpenBooking: (bookingId: string) => void;
}

const SEAT_STYLE: Record<string, string> = {
  available:
    "border border-dashed border-slate-300 text-slate-400 hover:border-brand hover:text-brand dark:border-zinc-700 dark:text-zinc-600",
  male: "bg-blue-600 text-white",
  female: "bg-pink-500 text-white",
  pending: "bg-yellow-500 text-white",
  blocked: "bg-gray-500 text-white dark:bg-gray-600",
};

type PanelMode = "menu" | "assign";

export function ConductorSeatMap({ tripId, layout, seatCount, initialSeats, bookings, stops, canAssignWalkup, onOpenBooking }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const grid = useMemo(() => layoutToGrid(layout, seatCount), [layout, seatCount]);
  const seatToBookingId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      for (const seat of b.seats) map.set(seat, b.id);
    }
    return map;
  }, [bookings]);

  const [seatStates, setSeatStates] = useState<Map<string, SeatState>>(
    () => new Map(initialSeats.map((s) => [s.seat_no, s])),
  );
  const [openSeat, setOpenSeat] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("menu");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [fromStopId, setFromStopId] = useState<string | null>(null);
  const [toStopId, setToStopId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const boardableStops = stops.filter((s) => s.can_board);
  const droppableStops = stops.filter((s) => s.can_drop);

  function seatKind(label: string): "available" | "male" | "female" | "pending" | "blocked" {
    const state = seatStates.get(label);
    if (!state) return "available";
    if (state.status === "blocked") return "blocked";
    if (state.status === "held") return "pending";
    return state.gender === "female" ? "female" : "male";
  }

  function openFor(label: string) {
    setError(null);
    setName("");
    setGender("male");
    setFromStopId(boardableStops[0]?.route_stop_id ?? null);
    setToStopId(droppableStops[droppableStops.length - 1]?.route_stop_id ?? null);
    setPanelMode("menu");
    setOpenSeat(label);
  }

  function closePanel() {
    setOpenSeat(null);
    setPanelMode("menu");
  }

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T | undefined> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError("Your session expired — please sign in again.");
      return undefined;
    }
    return fn(session.access_token);
  }

  async function handleBlock(label: string) {
    setBusy(true);
    setError(null);
    try {
      await withToken((token) => blockSeat(token, tripId, label));
      setSeatStates((prev) => new Map(prev).set(label, { seat_no: label, status: "blocked", gender: null }));
      closePanel();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not block this seat.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnblock(label: string) {
    setBusy(true);
    setError(null);
    try {
      await withToken((token) => unblockSeat(token, tripId, label));
      setSeatStates((prev) => {
        const next = new Map(prev);
        next.delete(label);
        return next;
      });
      closePanel();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not unblock this seat.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(label: string) {
    if (!name.trim()) {
      setError("Enter the passenger's name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await withToken((token) =>
        assignSeat(token, tripId, label, {
          gender,
          passengerName: name.trim(),
          fromStopId: fromStopId ?? undefined,
          toStopId: toStopId ?? undefined,
        }),
      );
      setSeatStates((prev) => new Map(prev).set(label, { seat_no: label, status: "booked", gender }));
      closePanel();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not assign this seat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="ui mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-dashed border-slate-300 dark:border-zinc-600" />
          Available
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
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-gray-500 dark:bg-gray-600" />
          Unavailable
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        {grid.map((row, r) => (
          <div key={r} className="flex items-center gap-2">
            {row.map((label, ci) => {
              if (label === null) return <span key={ci} className="w-6" aria-hidden />;
              const kind = seatKind(label);
              const hasBooking = kind === "male" || kind === "female" || kind === "pending";
              return (
                <div key={ci} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasBooking) {
                        const bookingId = seatToBookingId.get(label);
                        if (bookingId) onOpenBooking(bookingId);
                        return;
                      }
                      openFor(label);
                    }}
                    className={[
                      "ui flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors duration-200",
                      SEAT_STYLE[kind],
                    ].join(" ")}
                  >
                    {label}
                  </button>

                  {openSeat === label && (
                    <div
                      ref={panelRef}
                      className="absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-3 text-left shadow-lg"
                    >
                      {kind === "blocked" ? (
                        <div>
                          <p className="ui mb-2 text-xs text-slate-500 dark:text-zinc-400">
                            Seat {label} is marked unavailable.
                          </p>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleUnblock(label)}
                            className="ui w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-60"
                          >
                            {busy ? <Loader2 size={13} className="mx-auto animate-spin" /> : "Unblock seat"}
                          </button>
                        </div>
                      ) : panelMode === "menu" ? (
                        <div className="flex flex-col gap-1.5">
                          {canAssignWalkup && (
                            <button
                              type="button"
                              onClick={() => setPanelMode("assign")}
                              className="ui rounded-lg border border-border px-3 py-1.5 text-left text-xs font-medium hover:bg-muted"
                            >
                              Assign walk-up passenger
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleBlock(label)}
                            className="ui rounded-lg border border-border px-3 py-1.5 text-left text-xs font-medium hover:bg-muted disabled:opacity-60"
                          >
                            {busy ? "Blocking…" : "Block seat (out of service)"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Passenger name"
                            className="field py-1.5 text-xs"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setGender("male")}
                              className={`ui flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                gender === "male"
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-blue-600 text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              Male
                            </button>
                            <button
                              type="button"
                              onClick={() => setGender("female")}
                              className={`ui flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                gender === "female"
                                  ? "border-pink-500 bg-pink-500 text-white"
                                  : "border-pink-500 text-pink-500 dark:text-pink-400"
                              }`}
                            >
                              Female
                            </button>
                          </div>
                          {stops.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={fromStopId ?? ""}
                                onChange={(e) => setFromStopId(e.target.value)}
                                className="field py-1.5 text-xs"
                              >
                                {boardableStops.map((s) => (
                                  <option
                                    key={s.id}
                                    value={s.route_stop_id}
                                    disabled={!!toStopId && s.seq >= (stops.find((t) => t.route_stop_id === toStopId)?.seq ?? Infinity)}
                                  >
                                    Board: {s.location_name ?? "—"}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={toStopId ?? ""}
                                onChange={(e) => setToStopId(e.target.value)}
                                className="field py-1.5 text-xs"
                              >
                                {droppableStops.map((s) => (
                                  <option
                                    key={s.id}
                                    value={s.route_stop_id}
                                    disabled={!!fromStopId && s.seq <= (stops.find((t) => t.route_stop_id === fromStopId)?.seq ?? -Infinity)}
                                  >
                                    Drop: {s.location_name ?? "—"}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleAssign(label)}
                            className="ui rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg disabled:opacity-60"
                          >
                            {busy ? <Loader2 size={13} className="mx-auto animate-spin" /> : "Assign seat"}
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={closePanel}
                        className="ui mt-1.5 w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {error && (
        <p className="ui mt-3 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
