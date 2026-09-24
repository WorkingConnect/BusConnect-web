import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJourney, ApiError, type OperatorJourneyDetail } from "@/lib/api";
import { JourneyForm } from "../../new/journey-form";

export default async function EditJourneyPage({
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
      <Link href={`/login?next=/operator/journeys/${id}/edit`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to edit this journey
      </Link>
    );
  }

  let journey: OperatorJourneyDetail | null = null;
  let error: string | null = null;
  try {
    journey = await getJourney(session.access_token, id);
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
  if (!journey) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={`/operator/journeys/${id}`}
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to journey
      </Link>

      <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight">Edit journey</h1>
      <p className="ui mt-2 text-sm font-medium text-slate-600 dark:text-zinc-300">
        {journey.route?.name ?? "—"} · {journey.code}
      </p>

      <div className="mt-8">
        <JourneyForm initial={journey} />
      </div>
    </div>
  );
}
