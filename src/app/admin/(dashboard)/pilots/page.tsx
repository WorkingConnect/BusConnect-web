import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminPilots, getAdminPilotPhotoUrl, ApiError, type AdminPilot } from "@/lib/api";
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

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Pilots</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Every driver and conductor operators have registered — active immediately, no approval needed. Reject one
        here if it needs to be deactivated.
      </p>

      <PilotList pilots={pilotsWithPhoto} />
    </div>
  );
}
