import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TicketScanner } from "@/components/ticket-scanner";

export default async function ScanTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await params; // trip id isn't needed by the API (the token itself carries + is scoped server-side)
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/login?next=/operator" className="font-medium text-brand underline dark:text-blue-400">
          Sign in to scan tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/operator"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight">Scan boarding ticket</h1>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
        Only staff of the ticket&apos;s own operator can validate it. Scanning here works for any
        of your trips.
      </p>

      <div className="mt-6">
        <TicketScanner />
      </div>
    </div>
  );
}
