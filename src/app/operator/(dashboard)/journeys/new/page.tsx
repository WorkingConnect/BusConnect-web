import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JourneyForm } from "./journey-form";

export default function NewJourneyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/operator/journeys"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to journeys
      </Link>

      <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight">Create a journey</h1>
      <p className="ui mt-2 text-sm text-muted-foreground">
        A journey is a reusable service: a route, bus, crew, times and fare. Once saved, schedule the
        dates it runs from the Timetable.
      </p>

      <div className="mt-8">
        <JourneyForm />
      </div>
    </div>
  );
}
