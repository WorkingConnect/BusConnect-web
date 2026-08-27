"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, UserCheck, ChevronRight, ChevronUp, ChevronDown, X, ArrowUp, ArrowDown, Undo2 } from "lucide-react";
import type { OperatorManifest, OperatorManifestBooking, OperatorManifestStop } from "@/lib/api";
import { refundTicketSeats, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { ConductorSeatMap } from "./conductor-seat-map";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  reserved_unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  refunded: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Cancelled-booking refund state, shown instead of the plain "Cancelled"
 *  badge once the trip itself (and every booking on it) has been cancelled. */
function refundBadge(refundStatus: "pending_manual" | "processed" | null) {
  if (refundStatus === "processed") {
    return (
      <span className="ui rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        Refunded
      </span>
    );
  }
  if (refundStatus === "pending_manual") {
    return (
      <span className="ui rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        Refund pending
      </span>
    );
  }
  return (
    <span className="ui rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
      Cancelled
    </span>
  );
}

export function ManifestPanel({
  manifest,
  isPilot,
  isAdmin = false,
}: {
  manifest: OperatorManifest;
  isPilot: boolean;
  isAdmin?: boolean;
}) {
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
        // A booking self-cancelled while the trip is still live is dropped
        // (it's no one's seat anymore); once the trip itself is cancelled
        // every booking on it was force-cancelled too, and those stay
        // visible with their refund status so the passenger list doesn't
        // just go empty.
        .filter((b) => b.status !== "cancelled" || manifest.status === "cancelled")
        .flatMap((b) =>
          b.seats.map((seat) => ({
            key: `${b.id}:${seat}`,
            bookingId: b.id,
            seat,
            passengerName: b.passenger_name,
            passengerPhone: b.passenger_phone,
            status: b.status,
            refundStatus: b.refund_status,
            boarded: b.boarded_seats.includes(seat),
            refunded: b.refunded_seats.includes(seat),
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
                      <>
                        {r.boarded ? (
                          <span className="ui flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <UserCheck size={12} /> Boarded
                          </span>
                        ) : (
                          <span className="ui rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Not boarded
                          </span>
                        )}
                        {/* A refunded seat can never be boarded (enforced
                            server-side), so this only ever appears alongside
                            "Not boarded", never "Boarded". */}
                        {r.refunded && (
                          <span className="ui rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Refunded
                          </span>
                        )}
                      </>
                    ) : r.status === "cancelled" ? (
                      refundBadge(r.refundStatus)
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
          isAdmin={isAdmin}
          tripId={manifest.trip_id}
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
  isAdmin,
  tripId,
  onClose,
}: {
  booking: OperatorManifestBooking;
  showFare: boolean;
  isAdmin: boolean;
  tripId: string;
  onClose: () => void;
}) {
  // Admin refund is available for any confirmed, non-walkup booking with at
  // least one seat that hasn't boarded yet, regardless of trip status.
  const refundableSeats = booking.seats.filter(
    (s) => !booking.boarded_seats.includes(s) && !booking.refunded_seats.includes(s),
  );
  const adminRefundEligible = isAdmin && booking.status === "confirmed" && !booking.is_walkup && refundableSeats.length > 0;

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
        {showFare && (
          <DetailRow
            label="Fare"
            value={`LKR ${Number(booking.amount).toLocaleString("en-LK")}`}
          />
        )}
        {showFare && booking.refunded_amount > 0 && (
          <DetailRow
            label="Refunded"
            value={`LKR ${booking.refunded_amount.toLocaleString("en-LK")} (balance LKR ${(Number(booking.amount) - booking.refunded_amount).toLocaleString("en-LK")})`}
          />
        )}
        {booking.status === "cancelled" && (
          <DetailRow
            label="Refund"
            value={
              booking.refund_status === "processed"
                ? "Refunded"
                : booking.refund_status === "pending_manual"
                  ? "Pending"
                  : "Not applicable"
            }
          />
        )}
      </dl>

      {booking.passenger_phone && (
        <a
          href={`tel:${booking.passenger_phone}`}
          className="ui mt-4 flex w-full items-center justify-center rounded-xl bg-brand py-3 text-sm font-semibold text-brand-fg"
        >
          Call
        </a>
      )}

      {adminRefundEligible && (
        <AdminRefundTicketSection
          tripId={tripId}
          booking={booking}
          refundableSeats={refundableSeats}
          showFare={showFare}
        />
      )}
    </ModalShell>
  );
}

/** Admin-only — lets admin refund just some of a multi-seat booking's seats — e.g.
 *  two friends booked together but only one wants to cancel — at any point,
 *  for any reason. Already-boarded seats aren't selectable at all. */
function AdminRefundTicketSection({
  tripId,
  booking,
  refundableSeats,
  showFare,
}: {
  tripId: string;
  booking: OperatorManifestBooking;
  refundableSeats: string[];
  showFare: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(refundableSeats));
  const [pct, setPct] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const parsedPct = Math.max(0, Math.min(100, Number(pct) || 0));
  const farePerSeat = booking.amount / booking.seats.length;
  const segmentAmount = Math.round(farePerSeat * selected.size * 100) / 100;
  const refundAmount = Math.round(segmentAmount * (parsedPct / 100) * 100) / 100;

  function toggleSeat(seat: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat)) next.delete(seat);
      else next.add(seat);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) {
      setError("Select at least one seat.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const result = await refundTicketSeats(session.access_token, tripId, booking.id, [...selected], parsedPct);
      setDone(
        result.refundStatus === "pending_manual"
          ? "Queued — process it from the Refunds page."
          : "Recorded at 0% — nothing owed.",
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
        className="ui mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <Undo2 size={15} /> Refund ticket
      </button>
    );
  }

  return (
    <div className="ui mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
      {booking.seats.length > 1 && (
        <>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Seats to refund</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {booking.seats.map((seat) => {
              const boarded = booking.boarded_seats.includes(seat);
              const refunded = booking.refunded_seats.includes(seat);
              const disabled = boarded || refunded;
              const isSelected = selected.has(seat);
              return (
                <button
                  key={seat}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSeat(seat)}
                  className={`ui rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    disabled
                      ? "cursor-not-allowed border-slate-100 text-slate-300 dark:border-zinc-900 dark:text-zinc-700"
                      : isSelected
                        ? "border-brand bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300"
                        : "border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {seat}
                  {boarded && " · boarded"}
                  {refunded && " · refunded"}
                </button>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">Refund %</p>
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
            = LKR {refundAmount.toLocaleString("en-LK")} of {segmentAmount.toLocaleString("en-LK")}
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
          disabled={submitting || selected.size === 0}
          className="ui flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white disabled:opacity-60"
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
