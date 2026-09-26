"use client";

import Link from "next/link";
import { Building2, ShieldCheck, LogOut, ChevronDown, UserCircle } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/provider";
import { localizePath } from "@/lib/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "./user-menu";
import type { Identity } from "@/lib/use-identity";
import type { MyRoles } from "@/lib/api";

// Split out from user-menu.tsx and lazy-loaded (next/dynamic, ssr: false):
// @base-ui/react's dropdown primitive only matters once we know the visitor
// is signed in, which is never known during SSR (useIdentity is a client-only
// check) — so for every signed-out visitor (the common case for a fresh
// Lighthouse/PageSpeed run or first-time passenger) this code was previously
// shipped in the initial bundle but never even rendered. Splitting it into
// its own chunk means anonymous visitors never download it at all.
export function UserMenuDropdown({
  identity,
  roles,
  workspace,
  open,
  onOpenChange,
  onSignOut,
}: {
  identity: Identity;
  roles: MyRoles | null | undefined;
  workspace: "passenger" | "operator" | "admin";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}) {
  const t = useT("nav");
  const locale = useLocale();
  const initial = (identity.fullName ?? identity.email).charAt(0).toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2.5 transition-colors hover:bg-muted">
        <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={28} />
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="ui w-64 overflow-hidden rounded-xl p-0">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar avatarUrl={identity.avatarUrl} initial={initial} size={40} />
          <div className="min-w-0">
            {identity.fullName && <p className="truncate text-sm font-medium text-foreground">{identity.fullName}</p>}
            <p className="truncate text-xs text-muted-foreground">{identity.email}</p>
          </div>
        </div>

        <div className="p-1.5">
          {/* Passenger-only routes — not under /operator or /admin at all,
              so this workspace's own dashboard link (below) is the only
              sensible entry here. An operator whose application hasn't
              been approved yet also has no passenger identity to speak of
              here — profile/tickets only make sense once approved. */}
          {workspace === "passenger" && !(roles?.isOperator && roles.operatorStatus === "pending") && (
            <DropdownMenuItem
              render={<Link href={localizePath(locale, "/profile")} />}
              className="gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <UserCircle size={16} className="text-muted-foreground" />
              {t("profile")}
            </DropdownMenuItem>
          )}
          {workspace === "operator" && roles?.isOperator && (
            <DropdownMenuItem
              render={<Link href="/operator" />}
              className="gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <Building2 size={16} className="text-muted-foreground" />
              {roles.operatorRole === "pilot" ? t("conductorDashboard") : t("operatorDashboard")}
            </DropdownMenuItem>
          )}
          {workspace === "admin" && roles?.isAdmin && (
            <DropdownMenuItem
              render={<Link href="/admin" />}
              className="gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground"
            >
              <ShieldCheck size={16} className="text-muted-foreground" />
              {t("adminDashboard")}
            </DropdownMenuItem>
          )}
        </div>

        <DropdownMenuSeparator />
        <div className="p-1.5">
          <DropdownMenuItem variant="destructive" onClick={onSignOut} className="gap-3 rounded-lg px-3 py-2.5 text-sm font-medium">
            <LogOut size={16} />
            {t("signOut")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
