import { ShieldAlert } from "lucide-react";

/** Shown across the whole operator workspace whenever the admin_operator_id
 *  cookie is set — makes it unmistakable that actions here run against a
 *  real operator's data, not the admin's own account. */
export function AdminModeBanner({ operatorName }: { operatorName: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 sm:px-6 lg:px-8">
      <span className="flex items-center gap-2">
        <ShieldAlert size={15} />
        Admin mode — viewing {operatorName ?? "this operator"}&apos;s dashboard with full owner access.
      </span>
      {/* Plain <a>, not next/link — this hits a Route Handler (clears the
          admin_operator_id cookie via Set-Cookie, then redirects), which
          needs a real browser navigation rather than client-side routing. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/operator/admin-exit" className="ui shrink-0 rounded-lg bg-amber-950/10 px-2.5 py-1 font-semibold hover:bg-amber-950/20">
        Exit admin view
      </a>
    </div>
  );
}
