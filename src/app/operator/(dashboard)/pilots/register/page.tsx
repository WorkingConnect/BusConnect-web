import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegisterPilotForm } from "./register-pilot-form";

export default function RegisterPilotPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/operator/pilots"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to pilots
      </Link>

      <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight">Register a pilot</h1>
      <p className="ui mt-2 text-sm text-muted-foreground">
        Add a driver or conductor. They&apos;re active immediately, so you can assign them to a bus as soon as
        they&apos;re registered.
      </p>

      <div className="mt-8">
        <RegisterPilotForm />
      </div>
    </div>
  );
}
