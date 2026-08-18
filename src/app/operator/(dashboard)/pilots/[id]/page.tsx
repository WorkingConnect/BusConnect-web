import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getPilot,
  getPilotPhotoUrl,
  getOperatorFleet,
  ApiError,
  type OperatorPilotDetail,
} from "@/lib/api";
import { formatPhoneDisplay } from "@/lib/phone";
import { AssignFleetButton } from "../assign-fleet-button";
import { LinkAccountForm } from "./link-account-form";
import { PilotIdentityCard } from "./pilot-identity-card";

export default async function OperatorPilotDetailPage({
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
      <Link href={`/login?next=/operator/pilots/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this pilot
      </Link>
    );
  }

  let pilot: OperatorPilotDetail | null = null;
  let error: string | null = null;
  try {
    pilot = await getPilot(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error = e instanceof ApiError ? e.message : "Could not reach BusConnect-api. Is it running?";
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
      photoUrl = (await getPilotPhotoUrl(session.access_token, pilot.id)).url;
    } catch {
      photoUrl = null;
    }
  }

  let busOptions: { id: string; label: string }[] = [];
  try {
    const fleet = await getOperatorFleet(session.access_token);
    busOptions = fleet.buses
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b.id, label: `${b.reg_no} · ${b.bus_type?.name ?? "—"}` }));
  } catch {
    busOptions = [];
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <Link
        href="/operator/pilots"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to pilots
      </Link>

      <div className="mt-4">
        <PilotIdentityCard pilot={pilot} photoUrl={photoUrl} />
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Assign to fleet
        </h2>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          {pilot.status !== "active"
            ? "Only approved pilots can be assigned to a fleet."
            : !pilot.user_id
              ? "Link this pilot to a BusConnect account below before assigning them to a fleet."
              : "Choose one of your approved buses and whether they'll work as driver or conductor."}
        </p>
        <div className="mt-3">
          <AssignFleetButton
            pilotId={pilot.id}
            busOptions={busOptions}
            disabled={pilot.status !== "active" || !pilot.user_id}
          />
        </div>
      </div>

      <div className="card-lg mt-4 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          BusConnect account
        </h2>
        {pilot.user_id ? (
          <div className="ui mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {pilot.linked_phone ? formatPhoneDisplay(pilot.linked_phone) : "Linked account"}
              </p>
              <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/70">
                Can sign in and scan boarding tickets for their assigned trips.
              </p>
            </div>
            <span className="ui shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              Linked
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <LinkAccountForm pilotId={pilot.id} defaultPhone={pilot.phone_no} />
          </div>
        )}
      </div>
    </div>
  );
}
