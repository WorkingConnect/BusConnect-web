import Link from "next/link";
import { Banknote, Clock, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminRefunds, ApiError, type AdminRefund } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard, EmptyState } from "../dashboard-ui";
import { ProcessButton } from "./process-button";
import { DeleteRefundButton } from "./delete-refund-button";

const STATUS_STYLE: Record<string, string> = {
  processed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending_manual: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  not_eligible: "bg-muted text-muted-foreground",
};

/** For a wallet-cashout-on-account-deletion refund, the passenger row is
 *  already anonymized by the time admin sees this — contact_name/email/phone
 *  (captured at deletion time) are the only way left to tell whose it was. */
function deletedAccountLabel(r: AdminRefund): string {
  const parts = [r.contact_name, r.contact_email, r.contact_phone].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Account deletion";
}

function partyLabel(r: AdminRefund): string {
  return r.booking ? r.booking.trip?.bus?.operator?.name ?? "—" : deletedAccountLabel(r);
}

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
  const pendingAmount = pending.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Refunds</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Card payments are refunded through MPGS and wallet payments are credited back automatically.
        Anything without a paid payment on record falls back to manual processing.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <KpiCard icon={<Clock size={16} />} tone="amber" label="Awaiting processing" value={String(pending.length)} />
        <KpiCard
          icon={<Banknote size={16} />}
          tone="blue"
          label="Pending amount"
          value={`LKR ${pendingAmount.toLocaleString("en-LK")}`}
        />
        <KpiCard icon={<History size={16} />} tone="slate" label="History" value={String(others.length)} />
      </div>

      <h2 className="mt-8 font-heading text-lg font-semibold">Awaiting processing ({pending.length})</h2>
      <div className="mt-3">
        {pending.length === 0 ? (
          <EmptyState icon={<Clock size={32} className="mx-auto text-slate-400 dark:text-zinc-600" />} title="Nothing pending" subtitle="All caught up." />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount &amp; party</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      LKR {Number(r.amount).toLocaleString("en-LK")}
                      <span className="ui block text-xs font-normal text-muted-foreground">{partyLabel(r)}</span>
                    </TableCell>
                    <TableCell className="ui text-sm text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="text-right">
                      <ProcessButton refundId={r.id} refundMethod={r.refund_method} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {others.length > 0 && (
        <>
          <h2 className="mt-8 font-heading text-lg font-semibold">History</h2>
          <div className="mt-3">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount &amp; party</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {others.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        LKR {Number(r.amount).toLocaleString("en-LK")}
                        <span className="ui block text-xs font-normal text-muted-foreground">{partyLabel(r)}</span>
                      </TableCell>
                      <TableCell className="ui text-sm text-muted-foreground">{r.reason}</TableCell>
                      <TableCell>
                        <span
                          className={`ui inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteRefundButton refundId={r.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
