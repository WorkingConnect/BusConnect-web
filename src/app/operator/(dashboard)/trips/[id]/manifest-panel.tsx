"use client";

import { useMemo, useState } from "react";
import { User, Phone, UserCheck, ChevronRight, X, ArrowUp, ArrowDown } from "lucide-react";
import type { OperatorManifest, OperatorManifestBooking, OperatorManifestStop } from "@/lib/api";
import { ConductorSeatMap } from "./conductor-seat-map";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  reserved_unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  refunded: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function ManifestPanel({ manifest, isPilot }: { manifest: OperatorManifest; isPilot: boolean }) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const selectedBooking = useMemo(
    () => manifest.bookings.find((b) => b.id === selectedBookingId) ?? null,
    [manifest.bookings, selectedBookingId],
  );
  const selectedStop = useMemo(
    () => manifest.stops.find((s) => s.id === selectedStopId) ?? null,
    [manifest.stops, selectedStopId],
  );

  return (
    <>
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* seat map — conductor can block seats, add walk-up passengers, or view a booked seat's passenger */}
        <div className="lg:col-span-5">
          <h2 className="mb-3 font-heading text-lg font-semibold">Seat map</h2>
          <div className="card p-5">
            <ConductorSeatMap
              tripId={manifest.trip_id}
              layout={manifest.layout}
              seatCount={40}
              initialSeats={manifest.seats}
              bookings={manifest.bookings}
              onOpenBooking={setSelectedBookingId}
            />
          </div>
        </div>

        {/* passenger list */}
        <div className="lg:col-span-7">
          <h2 className="mb-3 font-heading text-lg font-semibold">Passengers</h2>
          {manifest.bookings.length === 0 ? (
            <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">
              No confirmed passengers yet for this trip.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {manifest.bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBookingId(b.id)}
                  className="card card-hover flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <User size={14} className="shrink-0 text-slate-400" />
                      {b.passenger_name ?? "Passenger"}
                    </p>
                    <p className="ui mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-zinc-500">
                      <span>Seats {b.seats.join(", ")}</span>
                      {b.passenger_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {b.passenger_phone}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {b.status === "confirmed" ? (
                      b.boarded ? (
                        <span className="ui flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <UserCheck size={12} /> Boarded
                        </span>
                      ) : (
                        <span className="ui rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Not boarded
                        </span>
                      )
                    ) : (
                      <span
                        className={`ui rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    )}
                    {!isPilot && (
                      <span className="font-heading text-sm font-bold text-brand dark:text-blue-400">
                        LKR {Number(b.amount).toLocaleString("en-LK")}
                      </span>
                    )}
                    <ChevronRight size={15} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* journey — this trip's stop timetable, with boarding/dropping counts per stop */}
      <div className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-semibold">Journey</h2>
        {manifest.stops.length === 0 ? (
          <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">
            No stop timetable for this trip.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {manifest.stops.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStopId(s.id)}
                className="card card-hover flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="font-medium">{s.location_name ?? "—"}</p>
                  <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
                    {s.scheduled_time.slice(0, 5)}
                    {s.day_offset > 0 && " (+1 day)"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.can_board && <StopCountBadge icon={ArrowUp} count={s.boarding_seats.length} color="emerald" />}
                  {s.can_drop && <StopCountBadge icon={ArrowDown} count={s.dropping_seats.length} color="blue" />}
                  <ChevronRight size={15} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedBooking && (
        <PassengerDetailModal booking={selectedBooking} showFare={!isPilot} onClose={() => setSelectedBookingId(null)} />
      )}
      {selectedStop && <StopDetailModal stop={selectedStop} onClose={() => setSelectedStopId(null)} />}
    </>
  );
}

function StopCountBadge({ icon: Icon, count, color }: { icon: typeof ArrowUp; count: number; color: "emerald" | "blue" }) {
  const active = count > 0;
  const textClass =
    color === "emerald"
      ? active
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-400 dark:text-zinc-500"
      : active
        ? "text-blue-600 dark:text-blue-400"
        : "text-slate-400 dark:text-zinc-500";
  return (
    <span className={`ui flex items-center gap-1 text-xs font-semibold ${textClass}`}>
      <Icon size={13} /> {count}
    </span>
  );
}

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="card-lg relative w-full max-w-sm p-6">{children}</div>
    </div>
  );
}

function PassengerDetailModal({
  booking,
  showFare,
  onClose,
}: {
  booking: OperatorManifestBooking;
  showFare: boolean;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3">
        <p className="flex-1 truncate font-heading text-base font-bold">{booking.passenger_name ?? "Passenger"}</p>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
          <X size={20} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {booking.seats.map((seat) => (
          <span
            key={seat}
            className="ui rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-zinc-800"
          >
            {seat}
          </span>
        ))}
      </div>

      <dl className="mt-4 flex flex-col">
        <DetailRow label="Boarding" value={booking.from_location ?? "—"} />
        <DetailRow label="Drop-off" value={booking.to_location ?? "—"} />
        {showFare && <DetailRow label="Fare" value={`LKR ${Number(booking.amount).toLocaleString("en-LK")}`} />}
      </dl>

      {booking.passenger_phone && (
        <a
          href={`tel:${booking.passenger_phone}`}
          className="ui mt-4 flex w-full items-center justify-center rounded-xl bg-brand py-3 text-sm font-semibold text-brand-fg"
        >
          Call
        </a>
      )}
    </ModalShell>
  );
}

function StopDetailModal({ stop, onClose }: { stop: OperatorManifestStop; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-bold">{stop.location_name ?? "—"}</p>
          <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
            {stop.scheduled_time.slice(0, 5)}
            {stop.day_offset > 0 && " (+1 day)"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">
          <X size={20} />
        </button>
      </div>

      {stop.can_board && <SeatStateGroup label={`Boarding here (${stop.boarding_seats.length})`} seats={stop.boarding_seats} tone="emerald" />}
      {stop.can_drop && <SeatStateGroup label={`Dropping here (${stop.dropping_seats.length})`} seats={stop.dropping_seats} tone="blue" />}
    </ModalShell>
  );
}

function SeatStateGroup({ label, seats, tone }: { label: string; seats: string[]; tone: "emerald" | "blue" }) {
  const chipClass =
    tone === "emerald"
      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
      : "border-blue-500 text-blue-600 dark:text-blue-400";
  return (
    <div className="mt-4">
      <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">{label}</p>
      {seats.length === 0 ? (
        <p className="ui mt-2 text-sm text-slate-500 dark:text-zinc-500">None.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {seats.map((seat) => (
            <span key={seat} className={`ui rounded-lg border px-2.5 py-1 text-xs font-semibold ${chipClass}`}>
              {seat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 py-2.5 text-sm first:border-t-0 dark:border-zinc-800/60">
      <span className="text-slate-500 dark:text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
