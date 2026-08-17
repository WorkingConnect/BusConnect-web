import Link from "next/link";
import { Wallet } from "lucide-react";
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
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <Wallet size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Every trip&apos;s earnings — awaiting settlement, still upcoming, or already paid out.
          </p>
        </div>
      </div>

      <RevenueView rows={data.rows} />
    </div>
  );
}
