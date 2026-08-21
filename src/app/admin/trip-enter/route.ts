import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_OPERATOR_COOKIE = "admin_operator_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Entry point for "view trip details" from the admin timetable. Unlike
 * operator/admin-enter (which crosses to the operator subdomain), this stays
 * entirely within the admin app: it sets the same admin_operator_id cookie —
 * every API call (lib/api.ts's request()) attaches it as X-Admin-Operator-Id,
 * which BusConnect-api's OperatorService.getMembership() verifies against
 * admin_users before honoring, so the check here is just to avoid setting a
 * pointless cookie for a signed-in-but-non-admin visitor — then redirects to
 * admin/timetable/[id], which renders the exact same manifest/seat-map
 * workspace an operator owner gets.
 */
export async function GET(request: NextRequest) {
  const operatorId = request.nextUrl.searchParams.get("operatorId");
  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!operatorId || !tripId || !UUID_RE.test(tripId)) {
    return NextResponse.redirect(new URL("/admin/timetable", request.url));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const landing = `/admin/timetable/${tripId}`;
  if (!adminRow) return NextResponse.redirect(new URL("/admin/timetable", request.url));

  const res = NextResponse.redirect(new URL(landing, request.url));
  res.cookies.set(ADMIN_OPERATOR_COOKIE, operatorId, {
    // Not httpOnly — client-side "use client" components (the seat map)
    // also read this via document.cookie in lib/api.ts to attach the
    // header themselves.
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
