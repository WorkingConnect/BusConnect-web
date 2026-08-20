import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listAdminJourneys, ApiError, type AdminJourney } from "@/lib/api";
import { JourneyList } from "./journey-list";

export default async function AdminReviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/review" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let journeys: AdminJourney[] = [];
  let error: string | null = null;
  try {
    journeys = await listAdminJourneys(session.access_token);
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
      <h1 className="font-heading text-2xl font-bold tracking-tight">Review</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Journeys operators have created — approve before they can be scheduled for trips.
      </p>

      <JourneyList journeys={journeys} />
    </div>
  );
}
