import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, ArrowUpRight, FileText, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminOperator, ApiError, type AdminOperator } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusActions } from "../status-actions";
import { ViewIdButton } from "../view-id-button";
import { DeleteOperatorButton } from "./delete-operator-button";
import { CommissionEditor } from "./commission-editor";
import { ConvenienceFeeEditor } from "./convenience-fee-editor";
import { WalkupPolicyEditor } from "./walkup-policy-editor";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  suspended: "On hold",
};

const STATUS_CAPTION: Record<string, string> = {
  active: "This operator can schedule trips, invite pilots, and board passengers.",
  pending: "Awaiting your review. Approve to let them start scheduling trips.",
  suspended: "Everything is frozen: no new trips, no new pilots, no ticket boarding.",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="break-words text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

/** A policy/fee row inside the combined "Policies & fees" card: label +
 *  description on the left, the live editor control on the right. */
function PolicyRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="sm:max-w-[60%]">
        <p className="text-sm font-medium">{title}</p>
        <p className="ui mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default async function AdminOperatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/admin/operators/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let operator: AdminOperator | null = null;
  let error: string | null = null;
  try {
    operator = await getAdminOperator(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
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
  if (!operator) notFound();

  // admin.busconnect.lk and operator.busconnect.lk are the same deployment,
  // internally rewritten (proxy.ts) — a plain relative link from the admin
  // subdomain would get "/admin" re-prepended to whatever path it's given,
  // producing a nonexistent route. Crossing to the operator workspace needs
  // a real absolute URL naming the other host explicitly. Off a workspace
  // subdomain (main domain / local dev), same host, /operator prefix instead.
  const host = (await headers()).get("host") ?? "";
  const isAdminSubdomain = host.startsWith("admin.");
  const protocol = host.includes("localhost") ? "http" : "https";
  const targetHost = isAdminSubdomain ? host.replace(/^admin\./, "operator.") : host;
  const targetPath = isAdminSubdomain ? "/admin-enter" : "/operator/admin-enter";
  const goToOperatorHref = `${protocol}://${targetHost}${targetPath}?operatorId=${operator.id}`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/operators"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to operators
      </Link>

      {/* ── Identity card: header + application details + ID doc, one
          compact card instead of three stacked full-width sections. ────── */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {operator.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={operator.logo_url}
                  alt={`${operator.name} logo`}
                  className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl border border-dashed border-border" />
              )}
              <div>
                <h1 className="font-heading text-xl font-bold tracking-tight">{operator.name}</h1>
                <p className="ui mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[operator.status]}`}>
                    {STATUS_LABEL[operator.status] ?? operator.status}
                  </span>
                  <span>★ {Number(operator.rating).toFixed(1)} · {Number(operator.reliability_score).toFixed(0)}% reliability</span>
                </p>
              </div>
            </div>
            <StatusActions operatorId={operator.id} status={operator.status} />
          </div>

          <p className="ui mt-4 flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            {STATUS_CAPTION[operator.status] ?? ""}
          </p>

          <a
            href={goToOperatorHref}
            target="_blank"
            rel="noopener noreferrer"
            className="ui mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Go to operator dashboard <ArrowUpRight size={14} />
          </a>

          <dl className="mt-4 divide-y divide-border border-t border-border">
            <Row label="Applicant account" value={operator.owner_email} />
            <Row
              label="Applied on"
              value={new Date(operator.created_at).toLocaleDateString("en-LK", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            <Row label="Witness name" value={operator.witness_name} />
            <Row label="Mobile number" value={operator.mobile_no} />
            <Row label="Company address" value={operator.address} />
          </dl>

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="ui text-xs font-medium text-muted-foreground">Registration / ID document</p>
              {operator.id_document_path ? (
                <div className="mt-1.5">
                  <ViewIdButton operatorId={operator.id} />
                </div>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">No document was submitted.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Policies & fees: commission, convenience fee, walk-up policy —
          three tiny editors folded into one card instead of three. ─────── */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Policies &amp; fees</CardTitle>
        </CardHeader>
        <CardContent>
          <PolicyRow
            title="Platform commission"
            description="BusConnect's cut of this operator's trip fares. Applies to future settlements only."
          >
            <CommissionEditor operatorId={operator.id} initialPct={operator.commission_pct} />
          </PolicyRow>
          <PolicyRow
            title="Convenience fee"
            description="Added at checkout on card and wallet payments alike. Takes effect on the next booking."
          >
            <ConvenienceFeeEditor operatorId={operator.id} initialPct={operator.convenience_fee_pct} />
          </PolicyRow>
          <PolicyRow
            title="Walk-up passengers"
            description="Limits cash walk-up seat assignment per trip. Resets per trip, not cumulatively."
          >
            <WalkupPolicyEditor
              operatorId={operator.id}
              initialEnabled={operator.walkup_enabled}
              initialLimit={operator.walkup_limit}
            />
          </PolicyRow>
        </CardContent>
      </Card>

      {/* ── Bank details ─────────────────────────────────────────────────── */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Bank details</CardTitle>
        </CardHeader>
        <CardContent>
          {operator.payout_account?.bankName || operator.payout_account?.accountNumber ? (
            <dl className="divide-y divide-border">
              <Row label="Bank name" value={operator.payout_account?.bankName} />
              <Row label="Branch name" value={operator.payout_account?.branchName} />
              <Row label="Account number" value={operator.payout_account?.accountNumber} />
              <Row label="Bank code" value={operator.payout_account?.bankCode} />
            </dl>
          ) : (
            <p className="ui text-sm text-muted-foreground">This operator hasn&apos;t added bank details yet.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="card-lg mt-5 border border-red-200/60 p-6 dark:border-red-900/40">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-red-500/80 dark:text-red-400/70">
          Danger zone
        </h2>
        <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="ui text-xs text-muted-foreground">
            Deleting removes this operator and its fleet/routes for good. Only possible if it has
            never had a trip scheduled. Operators with operating history should be put on hold
            instead.
          </p>
          <DeleteOperatorButton operatorId={operator.id} operatorName={operator.name} />
        </div>
      </div>
    </div>
  );
}
