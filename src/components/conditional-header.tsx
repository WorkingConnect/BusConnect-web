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
  if (path === "/admin/login" || path === "/operator/login") return null;

  if (path === "/admin" || path.startsWith("/admin/")) {
    return <WorkspaceHeader homeHref="/admin" workspace="admin" />;
  }
  if (path === "/operator" || path.startsWith("/operator/")) {
    return <WorkspaceHeader homeHref="/operator" workspace="operator" />;
  }
  return <SiteHeader />;
}
