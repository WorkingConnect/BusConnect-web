"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./admin-nav-items";

export function AdminNav({
  counts,
}: {
  counts?: {
    operators?: number;
    fleet?: number;
    pilots?: number;
    refunds?: number;
    review?: number;
    payouts?: number;
  };
}) {
  const pathname = usePathname();
  const badgeFor: Record<string, number | undefined> = {
    "/admin/operators": counts?.operators,
    "/admin/fleet": counts?.fleet,
    "/admin/pilots": counts?.pilots,
    "/admin/refunds": counts?.refunds,
    "/admin/review": counts?.review,
    "/admin/payouts": counts?.payouts,
  };

  return (
    <nav className="flex flex-col gap-0.5">
      {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href;
        const badge = badgeFor[href];
        return (
          <Link
            key={href}
            href={href}
            className={`ui flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
              active
                ? "bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Icon size={17} strokeWidth={2.2} />
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
