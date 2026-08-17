import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, TicketCheck, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBooking, ApiError, type Booking } from "@/lib/api";
import { PayButton } from "./pay-button";
import { CancelButton } from "./cancel-button";
import { HoldTimer } from "./hold-timer";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { id } = await params;
  const { paid, cancelled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href={`/login?next=/bookings/${id}`}
          className="font-medium text-brand underline dark:text-blue-400"
        >
          Sign in to view this booking
        </Link>
      </div>
    );
  }

  let booking: Booking | null = null;
  let error: string | null = null;
  try {
    booking = await getBooking(session.access_token, id);
  } catch (e) {
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Booking not found."}
        </p>
      </div>
    );
  }

  const isConfirmed = booking.status === "confirmed";
  const isPayable = booking.status === "pending" || booking.status === "reserved_unpaid";
  const isCancelled = booking.status === "cancelled";
  // Card and wallet payments both add a 2% convenience fee server-side
  // (mpgs.service.ts checkout(), 0055_wallet_convenience_fee.sql) — show it
  // up front so what's charged never surprises the payer, and once paid,
  // show what was actually charged (the payments row) rather than
  // recomputing, since a refund/adjustment could make that inaccurate.
  const CONVENIENCE_FEE_PCT = 0.02;
  const latestPayment = booking.payments?.[booking.payments.length - 1];
  const paidAmount = isConfirmed && latestPayment ? Number(latestPayment.amount) : null;
  const totalWithFee = Number(booking.amount) * (1 + CONVENIENCE_FEE_PCT);
  const hasDeparted = booking.trip
    ? new Date(booking.trip.depart_at).getTime() <= Date.now()
    : false;
  const isCancellable = (isConfirmed || isPayable) && !hasDeparted;
  const latestRefund = booking.refunds?.[booking.refunds.length - 1];

  const ticket = booking.tickets?.[0];
  // The QR encodes the signed Ed25519 token itself (not just an id) so a
  // conductor's scanner can verify authenticity fully offline — see
  // BusConnect-api's TicketSigningService / GET /tickets/public-key.
  const qrDataUrl =
    isConfirmed && ticket?.qr_signature
      ? await QRCode.toDataURL(ticket.qr_signature, {
          width: 320,
          margin: 1,
          color: { dark: "#0b1b3f", light: "#ffffff" },
        })
      : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Your booking</h1>
      <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">Ref {booking.id}</p>

      {paid && !isConfirmed && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Payment received — confirming your seats. Refresh in a moment.
        </p>
      )}
      {cancelled && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Payment cancelled. Your seats are held until the timer runs out.
        </p>
      )}

      <div className="card mt-6 p-6">
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="ui text-slate-500 dark:text-zinc-400">Seats</dt>
            <dd className="font-semibold">{booking.seats.join(", ")}</dd>
          </div>
          {isPayable ? (
            <>
              <div className="flex justify-between">
                <dt className="ui text-slate-500 dark:text-zinc-400">Subtotal</dt>
                <dd>LKR {Number(booking.amount).toLocaleString("en-LK")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="ui text-slate-500 dark:text-zinc-400">Convenience fee (2%)</dt>
                <dd>
                  LKR{" "}
                  {(Number(booking.amount) * CONVENIENCE_FEE_PCT).toLocaleString("en-LK", {
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 dark:border-zinc-800">
                <dt className="ui font-semibold text-slate-700 dark:text-zinc-300">Amount due</dt>
                <dd className="font-heading font-bold text-brand dark:text-blue-400">
                  LKR {totalWithFee.toLocaleString("en-LK", { maximumFractionDigits: 2 })}
                </dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <dt className="ui text-slate-500 dark:text-zinc-400">Amount</dt>
              <dd className="font-heading font-bold text-brand dark:text-blue-400">
                LKR {(paidAmount ?? Number(booking.amount)).toLocaleString("en-LK", {
                  maximumFractionDigits: 2,
                })}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="ui text-slate-500 dark:text-zinc-400">Status</dt>
            <dd
              className={
                isConfirmed
                  ? "flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold capitalize"
              }
            >
              {isConfirmed && <CheckCircle2 size={15} />}
              {booking.status.replace("_", " ")}
            </dd>
          </div>
        </dl>
      </div>

      {isConfirmed && ticket && qrDataUrl && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2 border-b border-emerald-200 px-5 py-3 dark:border-emerald-900/50">
            <TicketCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
            <p className="font-heading font-semibold text-emerald-800 dark:text-emerald-300">
              e-Ticket · scan to board
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Boarding QR code"
              width={200}
              height={200}
              className="rounded-xl bg-white p-2"
            />
            <p className="ui text-center text-xs text-emerald-700 dark:text-emerald-400/90">
              Ref {ticket.id.slice(0, 8).toUpperCase()} · show this QR to the conductor
            </p>
          </div>
        </div>
      )}

      {isCancelled && latestRefund && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Ban size={20} className="mt-0.5 shrink-0 text-slate-500 dark:text-zinc-400" />
          <div>
            <p className="font-heading font-semibold">Booking cancelled</p>
            <p className="ui mt-1 text-slate-600 dark:text-zinc-400">
              {Number(latestRefund.amount) > 0
                ? `LKR ${Number(latestRefund.amount).toLocaleString("en-LK")} refund — ${
                    latestRefund.status === "processed" ? "processed" : "being processed by our team"
                  }.`
                : "No refund was due for this cancellation."}
            </p>
          </div>
        </div>
      )}

      {isPayable && booking.holds?.[0]?.expires_at && (
        <HoldTimer expiresAt={booking.holds[0].expires_at} />
      )}

      {isPayable && (
        <div className="mt-6">
          <PayButton bookingId={booking.id} />
        </div>
      )}

      {isCancellable && booking.trip && (
        <div className="mt-6">
          <CancelButton
            bookingId={booking.id}
            amount={Number(booking.amount)}
            departAt={booking.trip.depart_at}
          />
        </div>
      )}

      <Link
        href="/"
        className="ui mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to search
      </Link>
    </div>
  );
}
