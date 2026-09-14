import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JourneyForm } from "./journey-form";

export default function NewJourneyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/operator/journeys"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to journeys
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Create a journey</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        A journey is a reusable service: a route, bus, crew, times and fare. Once saved, schedule the
        dates it runs from the Timetable.
      </p>

      <div className="mt-6">
        <JourneyForm />
      </div>
    </div>
  );
}
