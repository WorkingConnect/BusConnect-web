import Link from "next/link";
import {
  Building2,
  Bus,
  ClipboardCheck,
  HandCoins,
  IdCard,
  MapPin,
  Route as RouteIcon,
  Star,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminAnalytics,
  listAdminBuses,
  listAdminPilots,
  listAdminJourneys,
  listCancellationRequests,
  listAdminPayouts,
  ApiError,
  type AdminAnalytics,
  type AdminAnalyticsActivity,
} from "@/lib/api";

function money(n: number) {
  return `LKR ${Math.round(n).toLocaleString("en-LK")}`;
}

/** null when there's no yesterday to compare against — shown as "New" rather than a bogus %. */
function pctDelta(today: number, yesterday: number): number | null {
  if (yesterday <= 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const ACTIVITY_ICON: Record<AdminAnalyticsActivity["type"], React.ReactNode> = {
  booking: <Ticket size={14} />,
  operator: <Building2 size={14} />,
  review: <Star size={14} />,
};
const ACTIVITY_TONE: Record<AdminAnalyticsActivity["type"], string> = {
  booking: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  operator: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let analytics: AdminAnalytics | null = null;
  let error: string | null = null;
  try {
    analytics = await getAdminAnalytics(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !analytics) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  // Pending-action counts — same best-effort fetch layout.tsx does for the
  // sidebar badges; a failure here just means that one card shows 0 rather
  // than breaking a page whose headline numbers already loaded fine.
  let fleetPending = 0;
  let pilotsPending = 0;
  let reviewPending = 0;
  let payoutsPending = 0;
  try {
    const [buses, pilots, journeys, cancellationRequests, payouts] = await Promise.all([
      listAdminBuses(session.access_token),
      listAdminPilots(session.access_token),
      listAdminJourneys(session.access_token),
      listCancellationRequests(session.access_token),
      listAdminPayouts(session.access_token),
    ]);
    fleetPending = buses.filter((b) => b.status === "pending").length;
    pilotsPending = pilots.filter((p) => p.status === "pending").length;
    reviewPending = journeys.filter((j) => j.review_status === "pending").length + cancellationRequests.length;
    payoutsPending = payouts.filter((p) => p.settleable).length;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }

  const pendingCards = [
    {
      href: "/admin/operators",
      icon: <Building2 size={18} />,
      count: analytics.pendingOperators,
      title: "Operator approvals",
      subtitle: "New operators awaiting review",
      tone: "amber",
    },
    {
      href: "/admin/fleet",
      icon: <Bus size={18} />,
      count: fleetPending,
      title: "Fleet approvals",
      subtitle: "Buses awaiting review",
      tone: "blue",
    },
    {
      href: "/admin/pilots",
      icon: <IdCard size={18} />,
      count: pilotsPending,
      title: "Pilot approvals",
      subtitle: "Drivers/conductors awaiting review",
      tone: "emerald",
    },
    {
      href: "/admin/review",
      icon: <ClipboardCheck size={18} />,
      count: reviewPending,
      title: "Review queue",
      subtitle: "Journeys + cancellation requests",
      tone: "purple",
    },
    {
      href: "/admin/refunds",
      icon: <Wallet size={18} />,
      count: analytics.pendingRefundsCount,
      title: "Refunds",
      subtitle: `${money(analytics.pendingRefundsAmount)} to process manually`,
      tone: "red",
    },
    {
      href: "/admin/payouts",
      icon: <HandCoins size={18} />,
      count: payoutsPending,
      title: "Payouts",
      subtitle: "Settled trips ready to pay out",
      tone: "slate",
    },
  ] as const;
  const totalPending = pendingCards.reduce((s, c) => s + c.count, 0);

  const topOperators = [...analytics.perOperator].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  const maxMonthRevenue = Math.max(1, ...analytics.monthlyRevenue.map((m) => m.revenue));

  const todayDate = new Date().toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-brand p-6 text-brand-fg shadow-sm sm:p-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Welcome back, Admin</h1>
        <p className="mt-1 text-sm text-white/80">{todayDate} · Here&rsquo;s today so far</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BannerStat
            icon={<Ticket size={15} />}
            label="Bookings today"
            value={String(analytics.today.bookings)}
            delta={pctDelta(analytics.today.bookings, analytics.yesterday.bookings)}
          />
          <BannerStat
            icon={<Users size={15} />}
            label="New users today"
            value={String(analytics.today.newUsers)}
            delta={pctDelta(analytics.today.newUsers, analytics.yesterday.newUsers)}
          />
          <BannerStat
            icon={<Wallet size={15} />}
            label="Revenue today"
            value={money(analytics.today.revenue)}
            delta={pctDelta(analytics.today.revenue, analytics.yesterday.revenue)}
          />
        </div>
      </div>

      {/* ── Headline stats ────────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<Building2 size={16} />}
          tone="blue"
          label="Operators"
          value={String(analytics.totalOperators)}
          sub={`${analytics.pendingOperators} pending`}
        />
        <Stat icon={<RouteIcon size={16} />} tone="amber" label="Trips" value={String(analytics.totalTrips)} />
        <Stat icon={<Ticket size={16} />} tone="purple" label="Bookings" value={String(analytics.totalBookings)} />
        <Stat icon={<Wallet size={16} />} tone="emerald" label="Revenue" value={money(analytics.totalRevenue)} />
      </div>

      {/* ── Revenue trend + recent activity ──────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card-lg p-5">
          <p className="ui text-sm font-semibold text-slate-900 dark:text-white">Revenue: last 6 months</p>
          <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Confirmed bookings, net of refunds</p>
          <div className="mt-5 flex flex-col gap-3.5">
            {analytics.monthlyRevenue.map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="ui text-xs font-medium text-slate-600 dark:text-zinc-300">
                    {m.label} <span className="text-slate-400 dark:text-zinc-500">· {m.bookings} bookings</span>
                  </span>
                  <span className="ui text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                    {money(m.revenue)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-brand-soft dark:bg-brand-soft-dark">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(3, (m.revenue / maxMonthRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-lg p-5">
          <p className="ui text-sm font-semibold text-slate-900 dark:text-white">Recent activity</p>
          <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Latest bookings, signups, and reviews</p>
          <div className="mt-4 flex flex-col gap-3">
            {analytics.recentActivity.length === 0 ? (
              <p className="ui text-sm text-slate-500 dark:text-zinc-400">Nothing yet.</p>
            ) : (
              analytics.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ACTIVITY_TONE[a.type]}`}>
                    {ACTIVITY_ICON[a.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="ui text-xs text-slate-500 dark:text-zinc-400">
                      {a.subtitle} · {timeAgo(a.at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick actions + top operators ─────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card-lg p-5">
          <p className="ui text-sm font-semibold text-slate-900 dark:text-white">Quick actions</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickAction href="/admin/operators" icon={<Building2 size={18} />} tone="blue" title="Operators" subtitle="Review & manage" />
            <QuickAction href="/admin/review" icon={<ClipboardCheck size={18} />} tone="emerald" title="Review queue" subtitle="Journeys & requests" />
            <QuickAction href="/admin/revenue" icon={<TrendingUp size={18} />} tone="amber" title="Revenue" subtitle="Full breakdown" />
            <QuickAction href="/admin/routes" icon={<MapPin size={18} />} tone="purple" title="Routes" subtitle="Manage catalog" />
          </div>
        </div>

        <div className="card-lg p-5">
          <div className="flex items-center justify-between">
            <p className="ui text-sm font-semibold text-slate-900 dark:text-white">Top operators</p>
            <Link href="/admin/operators" className="ui text-xs font-medium text-brand hover:underline dark:text-blue-400">
              View all
            </Link>
          </div>
          {topOperators.length === 0 ? (
            <p className="ui mt-4 text-sm text-slate-500 dark:text-zinc-400">No revenue yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {topOperators.map((op, i) => (
                <div key={op.operatorId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{op.name}</p>
                      <p className="ui text-xs text-slate-500 dark:text-zinc-400">{op.bookings} bookings</p>
                    </div>
                  </div>
                  <span className="ui shrink-0 text-sm font-semibold text-brand dark:text-blue-400">{money(op.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending actions ───────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Pending actions</h2>
        {totalPending > 0 && (
          <span className="ui rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {totalPending} pending
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pendingCards.map((c) => (
          <PendingCard key={c.href} {...c} />
        ))}
      </div>

      {/* ── Full operator breakdown ───────────────────────────────────────── */}
      <h2 className="mt-8 font-heading text-lg font-semibold">By operator</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
        <table className="ui w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2.5">Operator</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Bookings</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {analytics.perOperator.map((op) => (
              <tr key={op.operatorId} className="border-t border-slate-200 dark:border-zinc-800">
                <td className="px-4 py-2.5 font-medium">{op.name}</td>
                <td className="px-4 py-2.5 capitalize text-slate-500 dark:text-zinc-400">{op.status}</td>
                <td className="px-4 py-2.5 text-right">{op.bookings}</td>
                <td className="px-4 py-2.5 text-right font-medium text-brand dark:text-blue-400">
                  {money(op.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BannerStat({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number | null;
}) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <div className="flex items-center gap-2 text-white/80">
        {icon}
        <span className="ui text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-xl font-bold">{value}</span>
        {delta === null ? (
          <span className="ui text-xs font-medium text-white/70">vs yesterday: n/a</span>
        ) : (
          <span className={`ui flex items-center gap-0.5 text-xs font-semibold ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
    </div>
  );
}

const TONE_STYLE: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function Stat({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLE;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_STYLE[tone]}`}>{icon}</span>
      <div className="mt-3 font-heading text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      <div className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{label}</div>
      {sub && <div className="ui mt-0.5 text-xs text-slate-400 dark:text-zinc-600">{sub}</div>}
    </div>
  );
}

function QuickAction({
  href,
  icon,
  tone,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLE;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="card card-hover flex flex-col gap-2.5 p-4">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_STYLE[tone]}`}>{icon}</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="ui text-xs text-slate-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </Link>
  );
}

function PendingCard({
  href,
  icon,
  tone,
  count,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLE;
  count: number;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="card card-hover flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_STYLE[tone]}`}>{icon}</span>
        {count > 0 && (
          <span className="ui flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </Link>
  );
}
