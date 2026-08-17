"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, User, Building2, IdCard, ShieldCheck, Ticket, ArrowUpRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminUser, hideAdminBooking, ApiError, type AdminUserDetail, type AdminUserBooking } from "@/lib/api";

function money(n: number) {
  return `LKR ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}
function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const BOOKING_STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new ApiError(401, "Please sign in.");
      setDetail(await getAdminUser(session.access_token, params.id));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.status === 403
            ? "Your account does not have admin access."
            : e.message
          : "Could not reach BusConnect-api. Is it running?",
      );
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleBookingHidden(bookingId: string) {
    setDetail((prev) => (prev ? { ...prev, bookings: prev.bookings.filter((b) => b.id !== bookingId) } : prev));
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> Loading user…
      </div>
    );
  }

  const p = detail.passenger;
  const displayName = p?.name ?? detail.email ?? "User";

  return (
    <div>
      <Link
        href="/admin/users"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to Users
      </Link>

      <div className="mt-4 flex items-center gap-3">
        {p?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar_url}
            alt={`${displayName} avatar`}
            className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            <User size={22} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-heading text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="ui mt-0.5 truncate text-sm text-slate-500 dark:text-zinc-400">
            {[detail.email, p?.phone].filter(Boolean).join(" · ") || "No contact on file"} · Joined{" "}
            {formatDate(detail.created_at)}
          </p>
        </div>
      </div>

      {p?.deleted_at && (
        <p className="ui mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          This passenger profile was deleted on {formatDate(p.deleted_at)}.
        </p>
      )}

      {/* ── Passenger profile ─────────────────────────────────────────── */}
      {p && (
        <Section icon={<User size={16} />} title="Passenger profile">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <Field label="Name" value={p.name} />
            <Field label="Phone" value={p.phone} />
            <Field label="Email" value={p.email} />
            <Field label="NIC" value={p.nic} />
          </div>
        </Section>
      )}

      {/* ── Wallet ─────────────────────────────────────────────────────── */}
      <Section icon={<Wallet size={16} />} title="Wallet">
        <p className="font-heading text-2xl font-bold text-brand dark:text-blue-400">
          {money(detail.wallet_balance)}
        </p>
      </Section>

      {/* ── Operator memberships ──────────────────────────────────────── */}
      {detail.operator_memberships.length > 0 && (
        <Section icon={<Building2 size={16} />} title="Operator membership">
          <div className="flex flex-col gap-2">
            {detail.operator_memberships.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                <div>
                  <p className="font-medium">{m.operator?.name ?? "—"}</p>
                  <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">
                    {m.role} · {m.operator?.status ?? "—"}
                  </p>
                </div>
                {m.operator && (
                  <Link
                    href={`/admin/operators/${m.operator.id}`}
                    className="ui inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline dark:text-blue-400"
                  >
                    View operator <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Pilot roster ──────────────────────────────────────────────── */}
      {detail.pilot_roster.length > 0 && (
        <Section icon={<IdCard size={16} />} title="Pilot / conductor roster">
          <div className="flex flex-col gap-2">
            {detail.pilot_roster.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                <div>
                  <p className="font-medium">
                    {r.operator?.name ?? "—"} {r.assigned_role ? `· ${r.assigned_role}` : ""}
                  </p>
                  <p className="ui text-xs capitalize text-slate-500 dark:text-zinc-400">
                    {r.status} {r.bus ? `· Bus ${r.bus.reg_no}` : "· Not assigned to a bus"}
                  </p>
                </div>
                <Link
                  href={`/admin/pilots/${r.id}`}
                  className="ui inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline dark:text-blue-400"
                >
                  View pilot <ArrowUpRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Admin role ────────────────────────────────────────────────── */}
      {detail.admin_role && (
        <Section icon={<ShieldCheck size={16} />} title="Platform admin">
          <p className="ui text-sm">
            This account has platform admin access (<span className="font-semibold capitalize">{detail.admin_role}</span>).
          </p>
        </Section>
      )}

      {/* ── Bookings ──────────────────────────────────────────────────── */}
      <Section icon={<Ticket size={16} />} title={`Bookings (${detail.bookings.length})`}>
        {detail.bookings.length === 0 ? (
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">No bookings on this account.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {detail.bookings.map((b) => (
              <BookingRow key={b.id} b={b} onHidden={() => handleBookingHidden(b.id)} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function BookingRow({ b, onHidden }: { b: AdminUserBooking; onHidden: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmHide() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await hideAdminBooking(session.access_token, b.id);
      onHidden();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not remove this booking.");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium">{b.trip?.route?.name ?? "—"}</p>
          <span className={`ui rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${BOOKING_STATUS_STYLE[b.status] ?? BOOKING_STATUS_STYLE.pending}`}>
            {b.status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-brand dark:text-blue-400">{money(b.amount)}</span>
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="ui rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmHide}
                disabled={busy}
                className="ui inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Remove this booking"
              className="ui rounded-lg border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 dark:border-zinc-800 dark:hover:bg-red-950/30"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-400">
        {b.trip?.bus?.operator?.name ?? "—"} · Bus {b.trip?.bus?.reg_no ?? "—"} ·{" "}
        {b.trip ? dateTime(b.trip.depart_at) : "—"} · Seats {b.seats.join(", ")}
      </p>
      {b.tickets.length > 0 && (
        <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">
          Ticket: {b.tickets[0].status}
          {b.tickets[0].boarded_seats.length > 0 ? ` (boarded ${b.tickets[0].boarded_seats.join(", ")})` : ""}
        </p>
      )}
      {b.payments.length > 0 && (
        <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">
          Payment: {b.payments[0].status} · {money(b.payments[0].amount)} · {b.payments[0].method}
        </p>
      )}
      {b.refunds.length > 0 && (
        <p className="ui mt-1 text-xs text-amber-600 dark:text-amber-400">
          Refund: {b.refunds[0].status} · {money(b.refunds[0].amount)} — {b.refunds[0].reason}
        </p>
      )}
      {error && <p className="ui mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        {icon} {title}
      </div>
      <div className="card p-4">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="ui text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}
