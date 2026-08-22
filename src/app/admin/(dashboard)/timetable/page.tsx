import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminTrips, ApiError, type AdminTrip } from "@/lib/api";
import { TimetableList } from "./timetable-list";

export default async function AdminTimetablePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/timetable" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let trips: AdminTrip[] = [];
  let error: string | null = null;
  try {
    // Not upcomingOnly — the page now sections trips into Upcoming/
    // Completed/Cancelled itself, so it needs the full set.
    trips = await listAdminTrips(session.access_token, false);
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Every trip scheduled across all operators, platform-wide.
          </p>
        </div>
        <div className="ui rounded-xl bg-slate-100 px-4 py-2 text-center dark:bg-zinc-900">
          <p className="font-heading text-xl font-bold text-brand dark:text-blue-400">{trips.length}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">Total</p>
        </div>
      </div>

      <TimetableList trips={trips} />
    </div>
  );
}
