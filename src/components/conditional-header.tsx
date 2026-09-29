import { headers } from "next/headers";
import { SiteHeader } from "./site-header";
import { WorkspaceHeader } from "./workspace-header";

/**
 * The operator and admin dashboards are their own workspaces, not the
 * passenger site with a sidebar bolted on — mirrors ConditionalFooter, which
 * already hides the marketing footer on these same routes.
 *
 * Reads the *effective* (post-rewrite) path from proxy.ts's x-effective-path
 * header rather than usePathname() — on operator.busconnect.lk/admin.
 * busconnect.lk the address bar never shows "/operator"/"/admin" (the
 * rewrite that adds that prefix is invisible to the browser), so a
 * client-side pathname check would always fall through to SiteHeader.
 */
export async function ConditionalHeader() {
  const path = (await headers()).get("x-effective-path") ?? "/";

  // Login pages are a standalone centered card + logo, no chrome at all —
  // not even the workspace header (there's nothing to navigate to yet).
  // Same for the operator application wizard, which is its own full-height
  // two-panel layout (see app/operator/apply/page.tsx) — a workspace header
  // on top would eat into that full-screen split for someone who isn't an
  // operator yet anyway.
  if (path === "/admin/login" || path === "/operator/login" || path === "/operator/apply") return null;

  if (path === "/admin" || path.startsWith("/admin/")) {
    return <WorkspaceHeader homeHref="/admin" workspace="admin" />;
  }
  if (path === "/operator" || path.startsWith("/operator/")) {
    return <WorkspaceHeader homeHref="/operator" workspace="operator" />;
  }
  return <SiteHeader />;
}
