import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBus, ApiError, type OperatorBusDetail } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BusIdentityCard } from "./bus-identity-card";
import { SeatGridPreview } from "@/components/seat-grid-preview";

export default async function OperatorBusDetailPage({
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
      <Link href={`/login?next=/operator/fleet/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this bus
      </Link>
    );
  }

  let bus: OperatorBusDetail | null = null;
  let error: string | null = null;
  try {
    bus = await getBus(session.access_token, id);
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
  if (!bus) notFound();

  return (
    <div className="w-full">
      <Link
        href="/operator/fleet"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to fleet
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <BusIdentityCard bus={bus} />
        </div>

        <Card className="lg:col-span-8">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid size={15} className="text-brand dark:text-blue-400" /> Seat map
              </CardTitle>
              <CardDescription className="mt-1">
                Set by BusConnect when this bus&apos;s photos and seat count were reviewed. Contact BusConnect
                support if it needs to change.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SeatGridPreview layout={bus.bus_type?.layout_json ?? null} seatCount={bus.bus_type?.seat_count ?? 40} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
