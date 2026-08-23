"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Building2, ShieldCheck, LogOut, ChevronDown, UserCircle } from "lucide-react";
import { useIdentity } from "@/lib/use-identity";
import { useT, useLocale } from "@/lib/i18n/provider";
import { localizePath } from "@/lib/i18n/navigation";

export function UserMenu({
  workspace = "passenger",
  signInVariant = "button",
}: {
  workspace?: "passenger" | "operator" | "admin";
  /** "link" renders signed-out "Sign in" as plain text (e.g. the public site
   *  header's flat utility row) instead of the default filled button. */
  signInVariant?: "button" | "link";
}) {
  const router = useRouter();
  const { identity, roles, signOut: doSignOut } = useIdentity();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useT("nav");
  const locale = useLocale();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function signOut() {
    await doSignOut();
    setOpen(false);
    router.push(localizePath(locale, "/"));
    router.refresh();
  }

  if (identity === undefined) {
    return <span className="h-9 w-20 animate-pulse rounded-xl bg-muted" />;
  }

  if (identity === null) {
    return (
      <Link
        href={localizePath(locale, "/login")}
        className={
          signInVariant === "link"
            ? "font-medium text-foreground transition-colors duration-300 hover:text-brand dark:hover:text-blue-400"
            : "rounded-xl bg-brand px-4 py-2 font-semibold text-brand-fg transition-colors duration-300 hover:bg-brand-hover"
        }
      >
        {t("signIn")}
      </Link>
    );
  }

  const initial = (identity.fullName ?? identity.email).charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-muted"
      >
        <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={28} />
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="ui absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg shadow-black/10 dark:shadow-black/40">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={40} />
            <div className="min-w-0">
              {identity.fullName && <p className="truncate text-sm font-medium text-foreground">{identity.fullName}</p>}
              <p className="truncate text-xs text-muted-foreground">{identity.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            {/* An operator whose application hasn't been approved yet has no
                passenger identity to speak of here — profile/tickets only
                make sense once they're through review. */}
            {!(roles?.isOperator && roles.operatorStatus === "pending") && (
              <>
                <MenuLink href={localizePath(locale, "/profile")} icon={UserCircle} onClick={() => setOpen(false)}>
                  {t("profile")}
                </MenuLink>
                <MenuLink href={localizePath(locale, "/tickets")} icon={Ticket} onClick={() => setOpen(false)}>
                  {t("myTickets")}
                </MenuLink>
              </>
            )}
            {workspace === "operator" && roles?.isOperator && (
              <MenuLink href="/operator" icon={Building2} onClick={() => setOpen(false)}>
                {roles.operatorRole === "pilot" ? t("conductorDashboard") : t("operatorDashboard")}
              </MenuLink>
            )}
            {workspace === "admin" && roles?.isAdmin && (
              <MenuLink href="/admin" icon={ShieldCheck} onClick={() => setOpen(false)}>
                {t("adminDashboard")}
              </MenuLink>
            )}
          </div>

          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={signOut}
              className="ui flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut size={16} />
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Google/OAuth profile photo when available, else an initial-letter circle. */
export function Avatar({
  avatarUrl,
  initial,
  size,
}: {
  avatarUrl?: string;
  initial: string;
  size: number;
}) {
  const [broken, setBroken] = useState(false);

  if (avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external OAuth provider URL, not a local/optimizable asset
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-brand-fg"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onClick,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="ui flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon size={16} className="text-muted-foreground" />
      {children}
    </Link>
  );
}
