import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RegisterBusForm } from "./register-bus-form";

export default function RegisterBusPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/operator/fleet"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to fleet
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Register a bus</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Submit your bus for approval. It stays pending (not schedulable for trips) until
        BusConnect reviews and approves it.
      </p>

      <div className="mt-6">
        <RegisterBusForm />
      </div>
    </div>
  );
}
