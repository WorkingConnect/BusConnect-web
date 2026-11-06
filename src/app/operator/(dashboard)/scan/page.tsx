import Link from "next/link";
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
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Scan tickets</h1>
        <p className="ui mt-1 text-sm text-muted-foreground">
          Point the camera at a passenger&apos;s QR. It works for any trip on your bus.
        </p>
      </div>

      <div className="mt-6">
        <TicketScanner />
      </div>
    </div>
  );
}
