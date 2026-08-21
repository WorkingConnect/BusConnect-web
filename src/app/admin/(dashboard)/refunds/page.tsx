import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminRefunds, ApiError, type AdminRefund } from "@/lib/api";
import { ProcessButton } from "./process-button";

const STATUS_STYLE: Record<string, string> = {
  processed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending_manual: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  not_eligible: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function AdminRefundsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/refunds" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let refunds: AdminRefund[] = [];
  let error: string | null = null;
  try {
    refunds = await listAdminRefunds(session.access_token);
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

  const pending = refunds.filter((r) => r.status === "pending_manual");
  const others = refunds.filter((r) => r.status !== "pending_manual");

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Refunds</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Card payments are refunded through MPGS and wallet payments are credited back automatically.
        Anything without a paid payment on record falls back to manual processing.
      </p>

      <h2 className="mt-6 font-heading text-lg font-semibold">
        Awaiting processing ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="card mt-3 p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
          Nothing pending — all caught up.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {pending.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  LKR {Number(r.amount).toLocaleString("en-LK")}{" "}
                  <span className="ui font-normal text-slate-500 dark:text-zinc-400">
                    · {r.booking.trip?.bus?.operator?.name ?? "—"}
                  </span>
                </p>
                <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">{r.reason}</p>
              </div>
              <ProcessButton refundId={r.id} refundMethod={r.refund_method} />
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-lg font-semibold">History</h2>
          <div className="mt-3 flex flex-col gap-2">
            {others.map((r) => (
              <div key={r.id} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">LKR {Number(r.amount).toLocaleString("en-LK")}</p>
                  <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">{r.reason}</p>
                </div>
                <span
                  className={`ui rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status] ?? ""}`}
                >
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
