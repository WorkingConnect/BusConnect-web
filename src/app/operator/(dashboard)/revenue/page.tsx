import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOperatorRevenue, ApiError, type OperatorRevenue } from "@/lib/api";
import { RevenueView } from "./revenue-view";

export default async function OperatorRevenuePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/revenue" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view your revenue
      </Link>
    );
  }

  let data: OperatorRevenue | null = null;
  let error: string | null = null;
  try {
    data = await getOperatorRevenue(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can view revenue."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !data) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Could not load revenue."}
      </p>
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="ui mt-1 text-sm text-muted-foreground">
          Every trip&apos;s earnings: awaiting settlement, still upcoming, or already paid out.
        </p>
      </div>

      <RevenueView rows={data.rows} />
    </div>
  );
}
