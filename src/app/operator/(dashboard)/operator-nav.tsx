"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bus, CalendarClock, CalendarRange, Wallet, UserPlus, UserCircle, ScanLine } from "lucide-react";

const items = [
  { label: "Overview", href: "/operator", icon: LayoutDashboard, ownerOnly: false },
  { label: "Pilots", href: "/operator/pilots", icon: UserPlus, ownerOnly: true },
  { label: "Fleet", href: "/operator/fleet", icon: Bus, ownerOnly: true },
  { label: "Journeys", href: "/operator/journeys", icon: CalendarClock, ownerOnly: true },
  { label: "Timetable", href: "/operator/timetable", icon: CalendarRange, ownerOnly: true },
  { label: "Revenue", href: "/operator/revenue", icon: Wallet, ownerOnly: true },
  { label: "Scan tickets", href: "/operator/scan", icon: ScanLine, ownerOnly: false },
  { label: "Profile", href: "/operator/profile", icon: UserCircle, ownerOnly: false },
] as const;

export function OperatorNav({
  role,
  counts,
}: {
  role: "owner" | "pilot";
  counts?: { fleet?: number; pilots?: number };
}) {
  const pathname = usePathname();
  const visible = items.filter((item) => !item.ownerOnly || role === "owner");
  const badgeFor: Record<string, number | undefined> = {
    "/operator/fleet": counts?.fleet,
    "/operator/pilots": counts?.pilots,
  };

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {visible.map(({ label, href, icon: Icon }) => {
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
