import { type NextRequest, NextResponse } from "next/server";

const ADMIN_OPERATOR_COOKIE = "admin_operator_id";

/**
 * Clears admin-context mode and sends the admin back to the operator's own
 * admin detail page. This route runs on operator.busconnect.lk (that's
 * where the banner's "Exit" link lives), so getting back to the admin
 * section means crossing back to admin.busconnect.lk — a relative redirect
 * would stay on the wrong host, same issue admin-enter had going the other
 * way. Off a workspace subdomain (main domain / local dev), same host,
 * explicit /admin prefix instead.
 */
export async function GET(request: NextRequest) {
  const operatorId = request.cookies.get(ADMIN_OPERATOR_COOKIE)?.value;
  const host = request.headers.get("host") ?? "";
  const isOperatorSubdomain = host.startsWith("operator.");
  const protocol = host.includes("localhost") ? "http" : "https";
  const targetHost = isOperatorSubdomain ? host.replace(/^operator\./, "admin.") : host;
  const targetPath = isOperatorSubdomain
    ? operatorId
      ? `/operators/${operatorId}`
      : "/operators"
    : operatorId
      ? `/admin/operators/${operatorId}`
      : "/admin/operators";

  const res = NextResponse.redirect(`${protocol}://${targetHost}${targetPath}`);
  res.cookies.delete(ADMIN_OPERATOR_COOKIE);
  return res;
}
