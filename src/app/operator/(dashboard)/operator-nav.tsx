"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useIdentity } from "@/lib/use-identity";
import { OPERATOR_NAV_ITEMS } from "./operator-nav-items";

export function OperatorNav({
  role,
  counts,
}: {
  role: "owner" | "pilot";
  counts?: { fleet?: number; pilots?: number };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useIdentity();
  const visible = OPERATOR_NAV_ITEMS.filter((item) => !item.ownerOnly || role === "owner");
  const badgeFor: Record<string, number | undefined> = {
    "/operator/fleet": counts?.fleet,
    "/operator/pilots": counts?.pilots,
  };

  async function handleSignOut() {
    await signOut();
    // Plain "/login", not localizePath — operator routes aren't locale
    // prefixed, so /en/login would 404 (see WorkspaceHeader/UserMenu).
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-col gap-0.5">
        {visible.map(({ label, href, icon: Icon }) => {
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
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="ui flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-700"
        >
          <LogOut size={17} strokeWidth={2.2} />
          Sign out
        </button>
      </div>
    </div>
  );
}
