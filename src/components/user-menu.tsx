"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/lib/use-identity";
import { useT, useLocale } from "@/lib/i18n/provider";
import { localizePath } from "@/lib/i18n/navigation";

// @base-ui/react's dropdown primitive is only needed once we know the
// visitor is signed in (identity !== null), which is never true during SSR —
// lazy-loading it means signed-out visitors (the common case for a fresh
// page load) never download this chunk at all.
const UserMenuDropdown = dynamic(
  () => import("./user-menu-dropdown").then((m) => m.UserMenuDropdown),
  { ssr: false, loading: () => <span className="h-9 w-9 animate-pulse rounded-full bg-muted" /> },
);

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
  const t = useT("nav");
  const locale = useLocale();

  // localizePath assumes it's operating within the passenger app (the only
  // place "/" and "/login" are actually under app/[lang]/) — on the
  // operator/admin subdomains those same paths already resolve correctly
  // on their own via the subdomain rewrite, and prefixing them with a
  // locale (e.g. "/en") points at a route that doesn't exist there at all.
  const rootHref = workspace === "passenger" ? localizePath(locale, "/") : "/";
  const loginHref = workspace === "passenger" ? localizePath(locale, "/login") : "/login";

  async function signOut() {
    await doSignOut();
    setOpen(false);
    router.push(rootHref);
    router.refresh();
  }

  if (identity === undefined) {
    return <span className="h-9 w-20 animate-pulse rounded-xl bg-muted" />;
  }

  if (identity === null) {
    return (
      <Link
        href={loginHref}
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

  return (
    <UserMenuDropdown
      identity={identity}
      roles={roles}
      workspace={workspace}
      open={open}
      onOpenChange={setOpen}
      onSignOut={signOut}
    />
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
      className="flex shrink-0 items-center justify-center rounded-full bg-black font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  );
}
