import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listOperatorTrips, listJourneys, ApiError, type OperatorTrip, type OperatorJourney } from "@/lib/api";
import { ScheduleForm } from "./schedule-form";
import { TimetableList } from "./timetable-list";

export default async function TimetablePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/timetable" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to manage your timetable
      </Link>
    );
  }

  let trips: OperatorTrip[] = [];
  let journeys: OperatorJourney[] = [];
  let error: string | null = null;
  try {
    [trips, journeys] = await Promise.all([
      listOperatorTrips(session.access_token),
      listJourneys(session.access_token),
    ]);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Only the operator owner can manage the timetable."
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
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Timetable</h1>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Schedule dated trips from your journeys. Each trip you add goes on sale to passengers immediately.
        </p>
      </div>

      <div className="mt-6">
        <ScheduleForm journeys={journeys} />
      </div>

      <TimetableList trips={trips} />
    </div>
  );
}
