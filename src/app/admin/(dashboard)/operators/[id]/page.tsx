import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminOperator, ApiError, type AdminOperator } from "@/lib/api";
import { StatusActions } from "../status-actions";
import { ViewIdButton } from "../view-id-button";
import { DeleteOperatorButton } from "./delete-operator-button";
import { CommissionEditor } from "./commission-editor";

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
  pending: "Awaiting your review — approve to let them start scheduling trips.",
  suspended: "Everything is frozen: no new trips, no new pilots, no ticket boarding.",
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
        <Icon size={15} />
      </div>
      <div>
        <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
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
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to operators
      </Link>

      {/* ── Header: identity + status + quick actions ─────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {operator.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={operator.logo_url}
                alt={`${operator.name} logo`}
                className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700" />
            )}
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">{operator.name}</h1>
              <p className="ui mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[operator.status]}`}>
                  {STATUS_LABEL[operator.status] ?? operator.status}
                </span>
                <span>★ {Number(operator.rating).toFixed(1)} · {Number(operator.reliability_score).toFixed(0)}% reliability</span>
              </p>
            </div>
          </div>
          <StatusActions operatorId={operator.id} status={operator.status} />
        </div>

        <p className="ui mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          {STATUS_CAPTION[operator.status] ?? ""}
        </p>

        <a
          href={goToOperatorHref}
          target="_blank"
          rel="noopener noreferrer"
          className="ui mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Go to operator dashboard <ArrowUpRight size={14} />
        </a>
      </div>

      {/* ── Application details ────────────────────────────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Application details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            icon={Mail}
            label="Applicant account"
            value={operator.owner_email ?? "—"}
          />
          <Field
            icon={CalendarDays}
            label="Applied on"
            value={new Date(operator.created_at).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <Field icon={UserCheck} label="Witness name" value={operator.witness_name ?? "—"} />
          <Field icon={Phone} label="Mobile number" value={operator.mobile_no ?? "—"} />
          <Field icon={MapPin} label="Company address" value={operator.address ?? "—"} />
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-5 dark:border-zinc-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400">
            <FileText size={15} />
          </div>
          {operator.id_document_path ? (
            <div>
              <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">
                Registration / ID document
              </p>
              <div className="mt-1.5">
                <ViewIdButton operatorId={operator.id} />
              </div>
            </div>
          ) : (
            <div>
              <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">
                Registration / ID document
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-500">No document was submitted.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bank details ─────────────────────────────────────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Bank details
        </h2>
        {operator.payout_account?.bankName || operator.payout_account?.accountNumber ? (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field icon={Landmark} label="Bank name" value={operator.payout_account?.bankName ?? "—"} />
            <Field icon={Building2} label="Branch name" value={operator.payout_account?.branchName ?? "—"} />
            <Field icon={Hash} label="Account number" value={operator.payout_account?.accountNumber ?? "—"} />
            <Field icon={Banknote} label="Bank code" value={operator.payout_account?.bankCode ?? "—"} />
          </div>
        ) : (
          <p className="ui mt-3 text-sm text-slate-500 dark:text-zinc-500">
            This operator hasn&apos;t added bank details yet.
          </p>
        )}
      </div>

      {/* ── Commission ──────────────────────────────────────────────────────── */}
      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Platform commission
        </h2>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          BusConnect&apos;s cut of this operator&apos;s trip fares. Applies to future settlements; already-paid
          trips keep their original rate.
        </p>
        <CommissionEditor operatorId={operator.id} initialPct={operator.commission_pct} />
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="card-lg mt-4 border-red-200/60 p-6 dark:border-red-900/40">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-red-500/80 dark:text-red-400/70">
          Danger zone
        </h2>
        <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="ui text-xs text-slate-600 dark:text-zinc-400">
            Deleting removes this operator and its fleet/routes for good. Only possible if it has
            never had a trip scheduled — operators with operating history should be put on hold
            instead.
          </p>
          <DeleteOperatorButton operatorId={operator.id} operatorName={operator.name} />
        </div>
      </div>
    </div>
  );
}
