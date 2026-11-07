import Link from "next/link";
import { Users, UserCheck, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminPilots, getAdminPilotPhotoUrl, ApiError, type AdminPilot } from "@/lib/api";
import { KpiCard } from "../dashboard-ui";
import { PilotList, type PilotWithPhoto } from "./pilot-list";

export default async function AdminPilotsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/pilots" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let pilots: AdminPilot[] = [];
  let error: string | null = null;
  try {
    pilots = await listAdminPilots(session.access_token);
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

  const photoUrls = new Map(
    (
      await Promise.all(
        pilots
          .filter((p) => p.profile_image_url)
          .map(async (p) => {
            try {
              const { url } = await getAdminPilotPhotoUrl(session.access_token, p.id);
              return [p.id, url] as const;
            } catch {
              return [p.id, null] as const;
            }
          }),
      )
    ).filter((entry): entry is [string, string] => !!entry[1]),
  );

  const pilotsWithPhoto: PilotWithPhoto[] = pilots.map((p) => ({
    ...p,
    photoUrl: photoUrls.get(p.id) ?? null,
  }));

  const activeCount = pilots.filter((p) => p.status === "active").length;
  const pendingCount = pilots.filter((p) => p.status === "pending").length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Pilots</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Every driver and conductor operators have registered. They&apos;re active immediately, no approval needed.
        Reject one here if it needs to be deactivated.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <KpiCard icon={<Users size={16} />} tone="blue" label="Total" value={String(pilots.length)} />
        <KpiCard icon={<UserCheck size={16} />} tone="emerald" label="Active" value={String(activeCount)} />
        <KpiCard icon={<UserCog size={16} />} tone="amber" label="Pending" value={String(pendingCount)} />
      </div>

      <PilotList pilots={pilotsWithPhoto} />
    </div>
  );
}
