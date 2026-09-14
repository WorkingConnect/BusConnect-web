import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Hash, Phone, Route as RouteIcon, ShieldAlert, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminPilots, getAdminPilotPhotoUrl, ApiError, type AdminPilot } from "@/lib/api";
import { StatusActions } from "../status-actions";
import { ViewPhotoButton } from "../view-photo-button";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending approval",
  rejected: "Rejected",
};

const STATUS_CAPTION: Record<string, string> = {
  active: "Approved. This pilot can be assigned to one of their operator's buses.",
  pending: "Awaiting your review. Approve to let the operator assign them to a bus.",
  rejected: "Rejected. This pilot cannot be assigned to a fleet.",
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

export default async function AdminPilotDetailPage({
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
      <Link href={`/login?next=/admin/pilots/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let pilot: AdminPilot | undefined;
  let error: string | null = null;
  try {
    // There's no single-pilot admin endpoint yet — the list is cheap enough
    // to fetch and find in, matching how few pilots exist per platform stage.
    const pilots = await listAdminPilots(session.access_token);
    pilot = pilots.find((p) => p.id === id);
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
  if (!pilot) notFound();

  let photoUrl: string | null = null;
  if (pilot.profile_image_url) {
    try {
      photoUrl = (await getAdminPilotPhotoUrl(session.access_token, pilot.id)).url;
    } catch {
      photoUrl = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/pilots"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to pilots
      </Link>

      <div className="card-lg mt-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={`${pilot.name} photo`}
                className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-zinc-700 dark:text-zinc-600">
                <User size={20} />
              </div>
            )}
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">{pilot.name}</h1>
              <p className="ui mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[pilot.status]}`}>
                  {STATUS_LABEL[pilot.status] ?? pilot.status}
                </span>
                <span>{pilot.operator?.name ?? "—"}</span>
              </p>
            </div>
          </div>
          <StatusActions pilotId={pilot.id} status={pilot.status} />
        </div>

        <p className="ui mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          {STATUS_CAPTION[pilot.status] ?? ""}
        </p>
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Registration details
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field icon={Hash} label="ID number" value={pilot.id_number} />
          <Field icon={Phone} label="Phone number" value={pilot.phone_no} />
          <Field
            icon={CalendarDays}
            label="Registered on"
            value={new Date(pilot.created_at).toLocaleDateString("en-LK", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <Field
            icon={RouteIcon}
            label="Fleet assignment"
            value={pilot.bus ? <span className="capitalize">{pilot.assigned_role} · {pilot.bus.reg_no}</span> : "Not assigned yet"}
          />
        </div>

        {pilot.profile_image_url && (
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-zinc-800">
            <ViewPhotoButton pilotId={pilot.id} />
          </div>
        )}
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          BusConnect account
        </h2>
        <p className="ui mt-3 text-sm text-slate-600 dark:text-zinc-400">
          {pilot.user_id
            ? "Linked. This pilot can sign in and scan boarding tickets for their assigned trips."
            : "Not linked yet. The operator can link this pilot to a BusConnect account once approved."}
        </p>
      </div>
    </div>
  );
}
