import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_OPERATOR_COOKIE = "admin_operator_id";

/**
 * Entry point for "Go to operator dashboard" (admin operators section).
 * Sets a cookie carrying the target operator id; every operator API call
 * (lib/api.ts's request()) then attaches it as X-Admin-Operator-Id, which
 * BusConnect-api verifies against admin_users before honoring — that's the
 * real security boundary, so the check here is just to avoid setting a
 * pointless cookie for a signed-in-but-non-admin visitor.
 */
export async function GET(request: NextRequest) {
  const operatorId = request.nextUrl.searchParams.get("operatorId");
  if (!operatorId) return NextResponse.redirect(new URL("/admin/operators", request.url));

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
  // On operator.busconnect.lk the clean root ("/") already resolves to the
  // dashboard via proxy.ts's subdomain rewrite; off that subdomain (main
  // domain or local dev) it needs the explicit /operator prefix.
  const host = request.headers.get("host") ?? "";
  const landing = host.startsWith("operator.") ? "/" : "/operator";
  if (!adminRow) return NextResponse.redirect(new URL(landing, request.url));

  const res = NextResponse.redirect(new URL(landing, request.url));
  res.cookies.set(ADMIN_OPERATOR_COOKIE, operatorId, {
    // Not httpOnly — client-side "use client" operator pages also read this
    // (via document.cookie in lib/api.ts) to attach the header themselves.
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
