import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminBuses, ApiError, type AdminBus } from "@/lib/api";
import { BusList } from "./bus-list";

export default async function AdminFleetPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/fleet" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let buses: AdminBus[] = [];
  let error: string | null = null;
  try {
    buses = await listAdminBuses(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Fleet</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Buses operators have registered. Approve before they can be scheduled for trips.
      </p>

      <BusList buses={buses} />
    </div>
  );
}
