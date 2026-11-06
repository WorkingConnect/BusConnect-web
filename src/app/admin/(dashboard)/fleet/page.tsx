import Link from "next/link";
import { Bus, CheckCircle2, Clock, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminBuses, ApiError, type AdminBus } from "@/lib/api";
import { KpiCard } from "../dashboard-ui";
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

  const activeCount = buses.filter((b) => b.status === "active").length;
  const pendingCount = buses.filter((b) => b.status === "pending").length;
  const rejectedCount = buses.filter((b) => b.status === "rejected").length;

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Fleet</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Buses operators have registered. Approve before they can be scheduled for trips.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Bus size={16} />} tone="blue" label="Total buses" value={String(buses.length)} />
        <KpiCard icon={<CheckCircle2 size={16} />} tone="emerald" label="Active" value={String(activeCount)} />
        <KpiCard icon={<Clock size={16} />} tone="amber" label="Pending" value={String(pendingCount)} />
        <KpiCard icon={<Ban size={16} />} tone="slate" label="Rejected" value={String(rejectedCount)} />
      </div>

      <BusList buses={buses} />
    </div>
  );
}
