"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, MoreHorizontal } from "lucide-react";
import { OperatorNav } from "./operator-nav";
import { OPERATOR_NAV_ITEMS } from "./operator-nav-items";

/**
 * Responsive chrome for the operator workspace.
 *
 * - Desktop (lg+): a sticky in-flow sidebar column.
 * - Mobile: a fixed bottom tab bar with the primary destinations plus a
 *   “More” tab that opens the full nav as a slide-in drawer (which also holds
 *   the overflow items and the sign-out button). The drawer closes animated
 *   on backdrop tap, the X, or Escape; tapping a nav link closes it instantly
 *   (no animation) since that also navigates — see `instantClose` below.
 */
export function OperatorChrome({
  role,
  counts,
}: {
  role: "owner" | "pilot";
  counts?: { fleet?: number; pilots?: number };
}) {
  const [open, setOpen] = useState(false);
  // True only for the instant just before/while the drawer closes because a
  // nav link was tapped. The (dashboard) layout — and this chrome inside it —
  // persists across route changes (Next.js doesn't remount layouts on
  // navigation within the same segment), but the new page's content swaps in
  // immediately while our slide/fade transition would otherwise keep
  // animating for another ~300ms. Without this, you'd briefly see the next
  // page rendered behind a drawer that's still visibly closing — exactly the
  // half-finished-looking overlap this flag exists to prevent. Explicit
  // dismissals (X button, backdrop tap) don't trigger a navigation, so they
  // keep the normal animated close.
  const [instantClose, setInstantClose] = useState(false);
  const pathname = usePathname();

  function openDrawer() {
    setInstantClose(false);
    setOpen(true);
  }
  function dismiss() {
    setInstantClose(false);
    setOpen(false);
  }
  function closeForNavigation() {
    setInstantClose(true);
    setOpen(false);
  }

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes the drawer (animated — no navigation involved).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setInstantClose(false);
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Primary mobile destinations (first few mobile-eligible items for this role);
  // everything else lives behind “More”.
  const tabs = OPERATOR_NAV_ITEMS.filter((i) => i.mobile && (!i.ownerOnly || role === "owner")).slice(0, 4);
  // Red dot on “More” when an overflow item (fleet/pilots approvals) needs attention.
  const moreBadge = (counts?.fleet ?? 0) + (counts?.pilots ?? 0) > 0;

  return (
    <>
      {/* Backdrop (mobile drawer) */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 lg:hidden ${instantClose ? "duration-0" : "duration-300"} transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Sidebar: drawer on mobile, sticky column on desktop. Tapping a nav
          link closes the drawer instantly (see closeForNavigation above). */}
      <aside
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) closeForNavigation();
        }}
        className={`fixed inset-y-0 left-0 z-[60] w-72 max-w-[82%] transform overflow-y-auto border-r border-border bg-card px-4 py-5 ease-out lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:px-5 lg:py-6 ${
          instantClose ? "duration-0" : "duration-300"
        } transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close menu"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted lg:hidden"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        <div className="flex min-h-full flex-col">
          <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Operator
          </p>
          <p className="font-heading mb-4 text-base font-bold tracking-tight">Workspace</p>
          <OperatorNav role={role} counts={counts} />
        </div>
      </aside>

      {/* Mobile bottom tab bar (hidden while the drawer is open) */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[max(0px,env(safe-area-inset-bottom))] lg:hidden ${
          open ? "hidden" : "flex"
        }`}
      >
        {tabs.map(({ short, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`ui flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                active ? "text-brand dark:text-blue-300" : "text-slate-500 dark:text-zinc-400"
              }`}
            >
              <Icon size={20} strokeWidth={2.1} />
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="More"
          className="ui relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-slate-500 transition-colors dark:text-zinc-400"
        >
          <MoreHorizontal size={20} strokeWidth={2.1} />
          More
          {moreBadge && (
            <span className="absolute right-[calc(50%-16px)] top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-card" />
          )}
        </button>
      </nav>
    </>
  );
}
