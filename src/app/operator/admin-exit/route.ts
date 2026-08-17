import { type NextRequest, NextResponse } from "next/server";

const ADMIN_OPERATOR_COOKIE = "admin_operator_id";

/** Clears admin-context mode and sends the admin back to the operator's own admin detail page. */
export async function GET(request: NextRequest) {
  const operatorId = request.cookies.get(ADMIN_OPERATOR_COOKIE)?.value;
  const destination = operatorId ? `/admin/operators/${operatorId}` : "/admin/operators";
  const res = NextResponse.redirect(new URL(destination, request.url));
  res.cookies.delete(ADMIN_OPERATOR_COOKIE);
  return res;
}
