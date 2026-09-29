import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Ban, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBooking, ApiError, type Booking } from "@/lib/api";
import { ThemedIcon } from "@/components/themed-icon";
import { CopyCodeButton } from "@/components/copy-code-button";
import { PayButton } from "./pay-button";
import { HoldTimer } from "./hold-timer";
import { PromoCodeForm } from "./promo-code-form";

const STATUS_PILL: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  reserved_unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

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
  // Card and wallet payments both add the operator's own convenience fee
  // server-side (mpgs.service.ts checkout(), pay_booking_from_wallet()) —
  // show it up front, at the operator's actual rate, so what's charged
  // never surprises the payer. Once paid, show what was actually charged
  // (the payments row) rather than recomputing, since a refund/adjustment
  // could make that inaccurate, and the rate could have changed since.
  const convenienceFeePct = booking.trip?.bus?.operator?.convenience_fee_pct ?? 2;
  const latestPayment = booking.payments?.[booking.payments.length - 1];
  const paidAmount = isConfirmed && latestPayment ? Number(latestPayment.amount) : null;
  const discountAmount = Number(booking.discount_amount ?? 0);
  const subtotalAfterDiscount = Number(booking.amount) - discountAmount;
  const totalWithFee = subtotalAfterDiscount * (1 + convenienceFeePct / 100);
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

  const operatorName = booking.trip?.bus?.operator?.name;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Your booking</h1>

      {paid && !isConfirmed && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          Payment received. Confirming your seats. Refresh in a moment.
        </p>
      )}
      {cancelled && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Payment cancelled. Your seats are held until the timer runs out.
        </p>
      )}

      {/* One ticket-stub card — booking details and the e-Ticket used to be
       *  two separate cards; merging them (with a perforated divider where
       *  the QR ticket begins) reads as a single boarding pass instead of a
       *  receipt followed by an unrelated QR code. */}
      <div className="card mt-6 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            {operatorName ? (
              <div className="flex min-w-0 items-center gap-2">
                {booking.trip?.bus?.operator?.logo_url ? (
                  <Image
                    src={booking.trip.bus.operator.logo_url}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
                    {operatorName.slice(0, 1)}
                  </span>
                )}
                <p className="font-heading truncate font-semibold">{operatorName}</p>
              </div>
            ) : (
              <span />
            )}
            <span
              className={`ui flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                STATUS_PILL[booking.status] ?? "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {isConfirmed && <CheckCircle2 size={12} />}
              {booking.status.replace("_", " ")}
            </span>
          </div>

          {(booking.from_stop?.location?.name_en || booking.to_stop?.location?.name_en) && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="ui text-[11px] text-slate-500 dark:text-zinc-400">From</p>
                <p className="font-semibold">{booking.from_stop?.location?.name_en ?? "—"}</p>
              </div>
              <div className="h-px flex-1 border-t border-dashed border-slate-300 dark:border-zinc-700" />
              <ArrowLeft size={14} className="rotate-180 shrink-0 text-brand dark:text-blue-400" />
              <div className="h-px flex-1 border-t border-dashed border-slate-300 dark:border-zinc-700" />
              <div className="text-right">
                <p className="ui text-[11px] text-slate-500 dark:text-zinc-400">To</p>
                <p className="font-semibold">{booking.to_stop?.location?.name_en ?? "—"}</p>
              </div>
            </div>
          )}

          {/* Highlighted — same treatment as the tickets list: the things a
           *  passenger actually checks (seats, when, reference) get a
           *  distinct surface instead of blending into a plain list. */}
          <dl className="ui mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-zinc-900/60">
            <div>
              <dt className="text-slate-500 dark:text-zinc-400">Seats</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">{booking.seats.join(", ")}</dd>
            </div>
            {booking.trip?.depart_at && (
              <div>
                <dt className="text-slate-500 dark:text-zinc-400">Departs</dt>
                <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                  {new Date(booking.trip.depart_at).toLocaleString("en-LK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500 dark:text-zinc-400">Reference</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {booking.id.slice(0, 8).toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-zinc-400">{isPayable ? "Amount due" : "Amount"}</dt>
              <dd className="mt-0.5 font-heading font-bold text-brand dark:text-blue-400">
                LKR{" "}
                {(isPayable ? totalWithFee : (paidAmount ?? Number(booking.amount))).toLocaleString("en-LK", {
                  maximumFractionDigits: 2,
                })}
              </dd>
            </div>
          </dl>

          {isPayable && (
            <dl className="ui mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm dark:border-zinc-800">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-zinc-400">Subtotal</dt>
                <dd>LKR {Number(booking.amount).toLocaleString("en-LK")}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-zinc-400">
                    Discount{booking.offer?.code ? ` (${booking.offer.code})` : ""}
                  </dt>
                  <dd className="text-emerald-600 dark:text-emerald-400">
                    -LKR {discountAmount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-zinc-400">Convenience fee ({convenienceFeePct}%)</dt>
                <dd>
                  LKR{" "}
                  {(subtotalAfterDiscount * (convenienceFeePct / 100)).toLocaleString("en-LK", {
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
            </dl>
          )}

          {isConfirmed && Number(booking.co2_saved_kg) > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Leaf size={15} className="shrink-0" />
              <p className="ui">
                Saves ~<span className="font-semibold">{Number(booking.co2_saved_kg).toFixed(1)} kg</span> of CO₂ vs.
                your usual ride.
              </p>
            </div>
          )}
        </div>

        {isConfirmed && ticket && qrDataUrl && (
          <>
            {/* Perforated divider — a dashed line with semicircle cutouts
             *  colored to match the page background, punched into the
             *  card's edges, so the QR half reads as the "tear here" stub
             *  of the same ticket rather than a separate box. */}
            <div className="relative h-0">
              <div className="absolute -left-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
              <div className="absolute -right-3 top-0 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
              <div className="absolute inset-x-6 top-0 -translate-y-1/2 border-t-2 border-dashed border-slate-200 dark:border-zinc-800" />
            </div>

            <div className="flex flex-col items-center gap-3 bg-slate-50 p-6 dark:bg-zinc-900/40">
              <p className="ui flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                <ThemedIcon base="ticket" size={14} /> e-Ticket · scan to board
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Boarding QR code"
                width={200}
                height={200}
                className="rounded-xl bg-white p-2"
              />
              <p className="ui text-center text-xs text-slate-500 dark:text-zinc-400">
                Show this QR to the conductor
              </p>
              <div className="ui flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                <span className="font-mono">Booking ID: {booking.id}</span>
                <CopyCodeButton
                  code={booking.id}
                  label="Copy"
                  copiedLabel="Copied"
                  iconSize={11}
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-brand dark:text-blue-400"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {isCancelled && latestRefund && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Ban size={20} className="mt-0.5 shrink-0 text-slate-500 dark:text-zinc-400" />
          <div>
            <p className="font-heading font-semibold">Booking cancelled</p>
            <p className="ui mt-1 text-slate-600 dark:text-zinc-400">
              {Number(latestRefund.amount) > 0
                ? `LKR ${Number(latestRefund.amount).toLocaleString("en-LK")} refund ${
                    latestRefund.status === "processed" ? "has been processed." : "is being processed by our team."
                  }`
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
          <PromoCodeForm bookingId={booking.id} appliedOffer={booking.offer} />
        </div>
      )}

      {isPayable && (
        <div className="mt-4">
          <PayButton bookingId={booking.id} holdExpiresAt={booking.holds?.[0]?.expires_at} />
        </div>
      )}
    </div>
  );
}
