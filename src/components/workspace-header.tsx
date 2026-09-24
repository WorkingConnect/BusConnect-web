"use client";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * Minimal header for the operator/admin dashboards — no passenger nav
 * (search/routes/tickets/language switcher), since those pages already have
 * their own sidebar nav (OperatorNav/AdminNav). Keeping this separate from
 * SiteHeader is what actually makes these feel like distinct workspaces
 * instead of the passenger site with an extra sidebar bolted on.
 *
 * The operator workspace skips UserMenu entirely — OperatorNav's own
 * sign-out at the bottom of the sidebar covers that, and duplicating it in
 * a dropdown here was redundant. Admin still gets it (no sidebar
 * equivalent yet).
 */
export function WorkspaceHeader({
  homeHref,
  workspace,
}: {
  homeHref: string;
  workspace: "operator" | "admin";
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2.5">
          <Logo href={homeHref} height={26} />
        </div>
        <div className="ui flex items-center gap-3 text-sm">
          <ThemeToggle />
          {workspace === "admin" && <UserMenu workspace={workspace} />}
        </div>
      </div>
    </header>
  );
}
