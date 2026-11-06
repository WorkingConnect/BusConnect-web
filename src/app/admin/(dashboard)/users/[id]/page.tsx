"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, IdCard, ShieldCheck, Ticket, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAdminUser, hideAdminBooking, ApiError, type AdminUserDetail, type AdminUserBooking } from "@/lib/api";
import { DeleteUserButton } from "./delete-user-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "../../dashboard-ui";

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
      <div className="flex items-center gap-2 text-muted-foreground">
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
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to Users
      </Link>

      {/* ── Identity card: avatar/name/contact + passenger fields, one
          compact card instead of a header bar plus a separate full-width
          "Passenger profile" section. ──────────────────────────────────── */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border after:rounded-2xl">
                {p?.avatar_url && <AvatarImage src={p.avatar_url} alt={`${displayName} avatar`} className="rounded-2xl" />}
                <AvatarFallback className="rounded-2xl bg-brand-soft text-lg font-bold leading-none text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-2xl font-bold tracking-tight">{displayName}</h1>
                <p className="ui mt-0.5 truncate text-sm text-muted-foreground">
                  {[detail.email, p?.phone].filter(Boolean).join(" · ") || "No contact on file"} · Joined{" "}
                  {formatDate(detail.created_at)}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="ui text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Wallet balance
              </p>
              <p className="font-heading mt-0.5 text-xl font-bold text-brand dark:text-blue-400">
                {money(detail.wallet_balance)}
              </p>
            </div>
          </div>

          {p?.deleted_at && (
            <p className="ui mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              This passenger profile was deleted on {formatDate(p.deleted_at)}.
            </p>
          )}

          {p && (
            <dl className="mt-4 divide-y divide-border border-t border-border">
              <Row label="Name" value={p.name} />
              <Row label="Phone" value={p.phone} />
              <Row label="Email" value={p.email} />
              <Row label="NIC" value={p.nic} />
            </dl>
          )}

          {/* ── Operator membership: folded into the identity card rather
              than its own separate full-width section below. ──────────── */}
          {detail.operator_memberships.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Operator membership
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {detail.operator_memberships.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <p className="font-medium">{m.operator?.name ?? "—"}</p>
                      <p className="ui text-xs capitalize text-muted-foreground">
                        {m.role} · {m.operator?.status ?? "—"}
                      </p>
                    </div>
                    {m.operator && (
                      <Button render={<Link href={`/admin/operators/${m.operator.id}`} />} nativeButton={false} variant="link" size="sm" className="gap-1">
                        View operator <ArrowUpRight size={12} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Admin access: a small tile, not a full-width bar ─────────────── */}
      {detail.admin_role && (
        <div className="mt-5 flex flex-wrap gap-3">
          <KpiCard
            icon={<ShieldCheck size={16} />}
            tone="emerald"
            label="Platform admin"
            value={detail.admin_role.charAt(0).toUpperCase() + detail.admin_role.slice(1)}
          />
        </div>
      )}

      {/* ── Pilot roster ──────────────────────────────────────────────── */}
      {detail.pilot_roster.length > 0 && (
        <Section icon={<IdCard size={16} />} title="Pilot / conductor roster">
          <div className="flex flex-col gap-2">
            {detail.pilot_roster.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-medium">
                    {r.operator?.name ?? "—"} {r.assigned_role ? `· ${r.assigned_role}` : ""}
                  </p>
                  <p className="ui text-xs capitalize text-muted-foreground">
                    {r.status} {r.bus ? `· Bus ${r.bus.reg_no}` : "· Not assigned to a bus"}
                  </p>
                </div>
                <Button render={<Link href={`/admin/pilots/${r.id}`} />} nativeButton={false} variant="link" size="sm" className="gap-1">
                  View pilot <ArrowUpRight size={12} />
                </Button>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Bookings ──────────────────────────────────────────────────── */}
      <Section icon={<Ticket size={16} />} title={`Bookings (${detail.bookings.length})`}>
        {detail.bookings.length === 0 ? (
          <p className="ui text-sm text-muted-foreground">No bookings on this account.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {detail.bookings.map((b) => (
              <BookingRow key={b.id} b={b} onHidden={() => handleBookingHidden(b.id)} />
            ))}
          </div>
        )}
      </Section>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="card-lg mt-8 border border-red-200/60 p-6 dark:border-red-900/40">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-red-500/80 dark:text-red-400/70">
          Danger zone
        </h2>
        <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="ui text-xs text-muted-foreground">
            Deleting removes this account for good. Only possible if it has no booking history and
            isn&apos;t linked to an operator or pilot login. Accounts with real history should stay
            as-is instead.
          </p>
          <DeleteUserButton userId={detail.id} userName={displayName} />
        </div>
      </div>
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
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium">{b.trip?.route?.name ?? "—"}</p>
          <Badge className={`rounded-full border-transparent capitalize ${BOOKING_STATUS_STYLE[b.status] ?? BOOKING_STATUS_STYLE.pending}`}>
            {b.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-brand dark:text-blue-400">{money(b.amount)}</span>
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="xs" onClick={() => setConfirming(false)} disabled={busy} className="rounded-lg">
                Cancel
              </Button>
              <Button variant="destructive" size="xs" onClick={confirmHide} disabled={busy} className="gap-1 rounded-lg">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirming(true)}
              aria-label="Remove this booking"
              className="rounded-lg text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      </div>
      <p className="ui mt-1 text-xs text-muted-foreground">
        {b.trip?.bus?.operator?.name ?? "—"} · Bus {b.trip?.bus?.reg_no ?? "—"} ·{" "}
        {b.trip ? dateTime(b.trip.depart_at) : "—"} · Seats {b.seats.join(", ")}
      </p>
      {b.tickets.length > 0 && (
        <p className="ui mt-1 text-xs text-muted-foreground">
          Ticket: {b.tickets[0].status}
          {b.tickets[0].boarded_seats.length > 0 ? ` (boarded ${b.tickets[0].boarded_seats.join(", ")})` : ""}
        </p>
      )}
      {b.payments.length > 0 && (
        <p className="ui mt-1 text-xs text-muted-foreground">
          Payment: {b.payments[0].status} · {money(b.payments[0].amount)} · {b.payments[0].method}
        </p>
      )}
      {b.refunds.length > 0 && (
        <p className="ui mt-1 text-xs text-amber-600 dark:text-amber-400">
          Refund: {b.refunds[0].status} · {money(b.refunds[0].amount)} ({b.refunds[0].reason})
        </p>
      )}
      {error && <p className="ui mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="break-words text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
