"use client";

import Link from "next/link";
import { useState } from "react";
import { Bus, CalendarDays, CheckCircle2, ChevronDown, Loader2, MapPin, QrCode, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hideBooking, ApiError } from "@/lib/api";
import { RateTripButton } from "./rate-trip-button";

export interface TicketBooking {
  id: string;
  code: string;
  seats: string[];
  amount: number;
  refundedSeats: string[];
  refundedAmount: number;
  status: string;
  createdAt: string;
  departAt: string | null;
  routeName: string | null;
  operatorName: string;
  operatorLogo: string | null;
  busType: string | null;
  busClass: string | null;
  regNo: string | null;
  qrDataUrl: string | null;
  ticketStatus: string | null;
  tripId: string | null;
  tripStatus: string | null;
}

type Tab = "confirmed" | "cancelled";

/** Unpaid bookings (pending/reserved_unpaid) aren't shown in the list at
 *  all — a booking only appears here once it's actually confirmed or
 *  explicitly cancelled, so there's nothing to filter/tab for an
 *  in-progress checkout that was never completed. */
function tabOf(status: string): Tab | null {
  if (status === "confirmed") return "confirmed";
  if (status === "cancelled" || status === "refunded") return "cancelled";
  return null;
}

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK")}`;
}

/** Numeric/short-name fields are stable across ICU versions; the piece that
 *  isn't is the punctuation `toLocaleString` glues them with — Node's ICU
 *  and the browser's disagree on "," vs " at " for combined date+time,
 *  which mismatches between this server-rendered "use client" page's SSR
 *  pass and its hydration pass. Building the string ourselves from parts
 *  sidesteps that, and pins the zone to Asia/Colombo so the hour doesn't
 *  also depend on whichever TZ the Node process happens to run in. */
function colomboParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod"),
  };
}
function dateTime(iso: string | null) {
  if (!iso) return "—";
  const p = colomboParts(iso);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
}
function dateOnly(iso: string) {
  const p = colomboParts(iso);
  return `${p.day} ${p.month} ${p.year}`;
}

const STATUS_BADGE: Record<Tab, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const STATUS_LABEL: Record<Tab, string> = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export function TicketsList({ bookings: initialBookings }: { bookings: TicketBooking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [tab, setTab] = useState<Tab>("confirmed");

  function handleDeleted(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  const visible = bookings.filter((b): b is TicketBooking & { status: string } => tabOf(b.status) !== null);
  const counts: Record<Tab, number> = {
    confirmed: visible.filter((b) => tabOf(b.status) === "confirmed").length,
    cancelled: visible.filter((b) => tabOf(b.status) === "cancelled").length,
  };
  const shown = visible.filter((b) => tabOf(b.status) === tab);

  const tabs: Tab[] = ["confirmed", "cancelled"];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`ui rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-brand text-brand-fg"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {STATUS_LABEL[t]} {counts[t]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card mt-5 p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
          No {STATUS_LABEL[tab].toLowerCase()} bookings.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {shown.map((b) => (
            <TicketCard key={b.id} b={b} t={tab} onDeleted={() => handleDeleted(b.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ b, t, onDeleted }: { b: TicketBooking; t: Tab; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const boarded = b.ticketStatus === "used";
  const arrived = b.tripStatus === "arrived";

  async function confirmDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await hideBooking(session.access_token, b.id);
      onDeleted();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Could not remove this ticket.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="card overflow-hidden p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`ui rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[t]}`}>
          {STATUS_LABEL[t]}
        </span>
        {b.busClass && (
          <span className="ui rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            {b.busClass.replace("_", " ")}
          </span>
        )}
        {boarded && (
          <span className="ui flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Boarded
          </span>
        )}
      </div>

      <h3 className="mt-2.5 font-heading text-lg font-bold tracking-tight">{b.routeName ?? b.operatorName}</h3>
      <p className="ui mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> {dateTime(b.departAt)}
        </span>
        <span className="flex items-center gap-1.5">
          <Bus size={13} /> {b.operatorName}
          {b.regNo ? ` · ${b.regNo}` : ""}
        </span>
      </p>

      {/* stats grid */}
      <dl className="ui mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-4 dark:border-zinc-800">
        <Stat label="Booking code" value={b.code} />
        <Stat label={b.seats.length === 1 ? "Seat" : "Seats"} value={b.seats.join(", ")} />
        <Stat label="Total paid" value={b.status === "confirmed" ? money(b.amount) : "—"} />
        <Stat label="Booked on" value={dateOnly(b.createdAt)} />
        {b.status === "confirmed" && b.refundedAmount > 0 && (
          <Stat
            label="Refunded"
            value={`${money(b.refundedAmount)} (balance ${money(b.amount - b.refundedAmount)})`}
          />
        )}
      </dl>

      {/* actions */}
      <div className="mt-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="ui text-xs text-slate-500 dark:text-zinc-400">Remove this ticket from your list?</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="ui rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="ui inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {t === "confirmed" && arrived && b.tripId && <RateTripButton tripId={b.tripId} />}
            {t === "confirmed" && !arrived && b.qrDataUrl && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
              >
                <QrCode size={15} />
                {open ? "Hide QR" : "Show QR ticket"}
                <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            )}
            <Link
              href={`/bookings/${b.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              View booking
            </Link>
            {t !== "confirmed" && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Remove this ticket"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2.5 text-red-600 transition-colors hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950/30"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
        {deleteError && <p className="ui mt-2 text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
      </div>

      {/* expandable QR */}
      {open && b.qrDataUrl && (
        <div className="mt-5 -mx-5 -mb-5 border-t border-slate-200 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mx-auto flex max-w-xs flex-col items-center">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.qrDataUrl} alt="Boarding QR code" className="h-52 w-52" />
              {boarded && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-zinc-950/70">
                  <span className="ui rotate-[-8deg] rounded-md bg-red-600 px-4 py-1.5 text-lg font-bold uppercase tracking-widest text-white shadow-lg">
                    Used
                  </span>
                </div>
              )}
            </div>
            <p className="ui mt-3 flex items-center gap-1.5 text-center text-xs text-slate-500 dark:text-zinc-500">
              <MapPin size={12} /> Show this at boarding · covers all {b.seats.length} seat
              {b.seats.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="ui text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="ui mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
