"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Wallet, PiggyBank, Search, Bus, Route, Images, IdCard, CalendarRange, HandCoins, TrendingUp, Users } from "lucide-react";

const items = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Operators", href: "/admin/operators", icon: Building2 },
  { label: "Timetable", href: "/admin/timetable", icon: CalendarRange },
  { label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
  { label: "Payouts", href: "/admin/payouts", icon: HandCoins },
  { label: "Wallet", href: "/admin/wallet", icon: PiggyBank },
  { label: "Fleet", href: "/admin/fleet", icon: Bus },
  { label: "Routes", href: "/admin/routes", icon: Route },
  { label: "Route Cards", href: "/admin/route-cards", icon: Images },
  { label: "Pilots", href: "/admin/pilots", icon: IdCard },
  { label: "Refunds", href: "/admin/refunds", icon: Wallet },
  { label: "Bookings", href: "/admin/bookings", icon: Search },
] as const;

export function AdminNav({
  counts,
}: {
  counts?: { operators?: number; fleet?: number; pilots?: number; refunds?: number };
}) {
  const pathname = usePathname();
  const badgeFor: Record<string, number | undefined> = {
    "/admin/operators": counts?.operators,
    "/admin/fleet": counts?.fleet,
    "/admin/pilots": counts?.pilots,
    "/admin/refunds": counts?.refunds,
  };

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        const badge = badgeFor[href];
        return (
          <Link
            key={href}
            href={href}
            className={`ui flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Icon size={16} />
            {label}
            {!!badge && (
              <span className="ui ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
