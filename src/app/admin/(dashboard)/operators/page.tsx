import Link from "next/link";
import { Building2, CheckCircle2, Clock, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminOperators, ApiError, type AdminOperator } from "@/lib/api";
import { KpiCard } from "../dashboard-ui";
import { OperatorList } from "./operator-list";

export default async function AdminOperatorsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/operators" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let operators: AdminOperator[] = [];
  let error: string | null = null;
  try {
    operators = await listAdminOperators(session.access_token);
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

  const activeCount = operators.filter((o) => o.status === "active").length;
  const pendingCount = operators.filter((o) => o.status === "pending").length;
  const suspendedCount = operators.filter((o) => o.status === "suspended").length;

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Operators</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Approve new bus companies before their trips become bookable, or put one on hold if needed.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Building2 size={16} />} tone="blue" label="Total operators" value={String(operators.length)} />
        <KpiCard icon={<CheckCircle2 size={16} />} tone="emerald" label="Active" value={String(activeCount)} />
        <KpiCard icon={<Clock size={16} />} tone="amber" label="Pending" value={String(pendingCount)} />
        <KpiCard icon={<Ban size={16} />} tone="slate" label="On hold" value={String(suspendedCount)} />
      </div>

      <OperatorList operators={operators} />
    </div>
  );
}
