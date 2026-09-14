import Link from "next/link";
import { ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TicketScanner } from "@/components/ticket-scanner";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/scan" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to scan tickets
      </Link>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
          <ScanLine size={18} />
        </span>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Scan tickets</h1>
          <p className="ui text-sm text-slate-500 dark:text-zinc-400">
            Point the camera at a passenger&apos;s QR. It works for any trip on your bus.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <TicketScanner />
      </div>
    </div>
  );
}
