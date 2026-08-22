"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Search, Route, Ticket, UserCircle, LogOut } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, Avatar } from "./user-menu";
import { LanguageSwitcher } from "./language-switcher";
import { useIdentity } from "@/lib/use-identity";
import { useT, useLocale } from "@/lib/i18n/provider";
import { localizePath } from "@/lib/i18n/navigation";

// "Operator dashboard" is deliberately not a static item here — the drawer's
// Account section shows it (or "Become an operator") contextually based on
// the signed-in user's actual role/status, which a fixed public nav link can't do.
const navItems = [
  { key: "searchBuses", href: "/", icon: Search },
  { key: "popularRoutes", href: "/#routes", icon: Route },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const t = useT("nav");
  const locale = useLocale();

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Top bar — utility */}
        <div className="border-b-0 bg-transparent transition-colors duration-300 sm:border-b sm:border-border sm:bg-card/80 sm:backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Logo href={localizePath(locale, "/")} height={44} />

            <div className="ui flex items-center gap-3 text-sm">
              <LanguageSwitcher />
              <ThemeToggle />
              <span className="hidden sm:inline-flex">
                <UserMenu />
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar — primary nav (brand) */}
        <div className="hidden bg-brand text-brand-fg lg:block">
          <nav className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
            {navItems.map(({ key, href, icon: Icon }) => (
              <Link
                key={key}
                href={localizePath(locale, href)}
                className="ui flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-white/90 transition-colors duration-300 hover:border-white hover:text-white"
              >
                <Icon size={15} />
                {t(key)}
              </Link>
            ))}
            <Link
              href={localizePath(locale, "/tickets")}
              className="ui flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-white/90 transition-colors duration-300 hover:border-white hover:text-white"
            >
              <Ticket size={15} />
              {t("myTickets")}
            </Link>
          </nav>
        </div>

        <MobileDrawer open={open} onClose={() => setOpen(false)} />
      </header>
      <MobileBottomNav onOpenMenu={() => setOpen(true)} />
    </>
  );
}

function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const t = useT("nav");
  const locale = useLocale();
  const tabs = [
    { key: "tabSearch", href: "/", icon: Search },
    { key: "tabRoutes", href: "/#routes", icon: Route },
    { key: "tabTickets", href: "/tickets", icon: Ticket },
  ] as const;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.12)] backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ key, href, icon: Icon }) => {
          const localized = localizePath(locale, href);
          const active = href === "/" ? pathname === localized : pathname.startsWith(localized);
          return (
            <Link
              key={key}
              href={localized}
              className={`ui flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-brand dark:text-blue-400" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} />
              {t(key)}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="ui flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
        >
          <Menu size={20} />
          {t("menu")}
        </button>
      </div>
    </nav>
  );
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { identity, signOut: doSignOut } = useIdentity();
  const t = useT("nav");
  const locale = useLocale();

  async function signOut() {
    await doSignOut();
    onClose();
    router.push(localizePath(locale, "/"));
    router.refresh();
  }

  function go(href: string) {
    onClose();
    router.push(localizePath(locale, href));
  }

  const initial = identity ? (identity.fullName ?? identity.email).charAt(0).toUpperCase() : "";

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-xs flex-col bg-card shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Logo href={localizePath(locale, "/")} />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ui flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("browse")}
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {navItems.map(({ key, href, icon: Icon }) => (
              <Link
                key={key}
                href={localizePath(locale, href)}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Icon size={17} className="text-brand dark:text-blue-400" />
                {t(key)}
              </Link>
            ))}
          </nav>

          <p className="mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("account")}
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            <Link
              href={localizePath(locale, "/tickets")}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Ticket size={17} className="text-brand dark:text-blue-400" />
              {t("myTickets")}
            </Link>
            {identity && (
              <Link
                href={localizePath(locale, "/profile")}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <UserCircle size={17} className="text-brand dark:text-blue-400" />
                {t("profile")}
              </Link>
            )}
          </nav>
        </div>

        <div className="ui border-t border-border p-4">
          {identity ? (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={40} />
                <div className="min-w-0">
                  {identity.fullName && (
                    <p className="truncate text-sm font-medium">{identity.fullName}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{identity.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
              >
                <LogOut size={16} />
                {t("signOut")}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => go("/login")} className="btn-primary w-full">
              {t("signIn")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
