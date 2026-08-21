"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, UserCheck, ChevronRight, ChevronUp, ChevronDown, X, ArrowUp, ArrowDown, Undo2 } from "lucide-react";
import type { OperatorManifest, OperatorManifestBooking, OperatorManifestStop } from "@/lib/api";
import { requestNoShowRefund, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
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
  const [passengersExpanded, setPassengersExpanded] = useState(true);
  const [journeyExpanded, setJourneyExpanded] = useState(true);

  const selectedBooking = useMemo(
    () => manifest.bookings.find((b) => b.id === selectedBookingId) ?? null,
    [manifest.bookings, selectedBookingId],
  );
  // One row per seat, not per booking — a single booking can hold several
  // seats, and each is its own passenger for headcount/list purposes (the
  // detail modal still opens the whole booking, seats and all).
  const seatRows = useMemo(
    () =>
      manifest.bookings
        .filter((b) => b.status !== "cancelled")
        .flatMap((b) =>
          b.seats.map((seat) => ({
            key: `${b.id}:${seat}`,
            bookingId: b.id,
            seat,
            passengerName: b.passenger_name,
            passengerPhone: b.passenger_phone,
            status: b.status,
            boarded: b.boarded_seats.includes(seat),
          })),
        ),
    [manifest.bookings],
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
              stops={manifest.stops}
              canAssignWalkup={manifest.can_assign_walkup}
              onOpenBooking={setSelectedBookingId}
            />
          </div>
        </div>

        {/* passenger list */}
        <div className="lg:col-span-7">
          <button
            type="button"
            onClick={() => setPassengersExpanded((v) => !v)}
            className="mb-3 flex w-full items-center justify-between gap-2"
          >
            <h2 className="font-heading text-lg font-semibold">Passengers ({seatRows.length})</h2>
            {passengersExpanded ? (
              <ChevronUp size={18} className="text-slate-400" />
            ) : (
              <ChevronDown size={18} className="text-slate-400" />
            )}
          </button>
          {!passengersExpanded ? null : seatRows.length === 0 ? (
            <div className="card p-10 text-center text-slate-500 dark:text-zinc-400">
              No confirmed passengers yet for this trip.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {seatRows.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedBookingId(r.bookingId)}
                  className="card card-hover flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <User size={14} className="shrink-0 text-slate-400" />
                      {r.passengerName ?? "Passenger"}
                    </p>
                    <p className="ui mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-zinc-500">
                      <span>Seat {r.seat}</span>
                      {r.passengerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} /> {r.passengerPhone}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.status === "confirmed" ? (
                      r.boarded ? (
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
                          STATUS_STYLE[r.status] ?? STATUS_STYLE.pending
                        }`}
                      >
                        {r.status.replace("_", " ")}
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
        <button
          type="button"
          onClick={() => setJourneyExpanded((v) => !v)}
          className="mb-3 flex w-full items-center justify-between gap-2"
        >
          <h2 className="font-heading text-lg font-semibold">Journey</h2>
          {journeyExpanded ? (
            <ChevronUp size={18} className="text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-400" />
          )}
        </button>
        {!journeyExpanded ? null : manifest.stops.length === 0 ? (
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
        <PassengerDetailModal
          booking={selectedBooking}
          showFare={!isPilot}
          tripId={manifest.trip_id}
          tripStatus={manifest.status}
          onClose={() => setSelectedBookingId(null)}
        />
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
  tripId,
  tripStatus,
  onClose,
}: {
  booking: OperatorManifestBooking;
  showFare: boolean;
  tripId: string;
  tripStatus: string;
  onClose: () => void;
}) {
  // No-show refund is only offered once the trip has genuinely ended, for a
  // paid (non-walkup) booking that never checked in — matches exactly what
  // the passenger list already shows via the "Not boarded" badge.
  const noShowEligible =
    tripStatus === "arrived" && booking.status === "confirmed" && !booking.boarded && !booking.is_walkup;

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

      {noShowEligible && (
        <NoShowRefundSection tripId={tripId} bookingId={booking.id} amount={booking.amount} showFare={showFare} />
      )}
    </ModalShell>
  );
}

function NoShowRefundSection({
  tripId,
  bookingId,
  amount,
  showFare,
}: {
  tripId: string;
  bookingId: string;
  amount: number;
  showFare: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const parsedPct = Math.max(0, Math.min(100, Number(pct) || 0));

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const result = await requestNoShowRefund(session.access_token, tripId, bookingId, parsedPct);
      setDone(
        result.refundStatus === "pending_manual"
          ? "Queued — an admin still needs to process it from the Refunds page."
          : "Recorded as a 0% no-show — nothing owed.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not queue this refund.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="ui mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        {done}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <Undo2 size={15} /> No-show refund
      </button>
    );
  }

  return (
    <div className="ui mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
      <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Refund % for this no-show</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="ui w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        />
        <span className="text-sm text-slate-500 dark:text-zinc-400">%</span>
        {showFare && (
          <span className="ui ml-auto text-xs text-slate-500 dark:text-zinc-400">
            = LKR {Math.round(amount * (parsedPct / 100) * 100) / 100} of {amount.toLocaleString("en-LK")}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="ui flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="ui flex-1 rounded-lg bg-brand py-2 text-xs font-semibold text-brand-fg disabled:opacity-60"
        >
          {submitting ? "Queuing…" : "Confirm refund"}
        </button>
      </div>
    </div>
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
