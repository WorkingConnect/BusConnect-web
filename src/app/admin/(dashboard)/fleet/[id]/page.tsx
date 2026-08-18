import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminBus, listAdminBusTypes, getAdminBusLayout, ApiError, type AdminBusDetail, type AdminBusType, type AdminBusLayoutContext } from "@/lib/api";
import { BusDetailCard } from "./bus-detail-card";
import { SeatMapEditor } from "./seat-map/seat-map-editor";

export default async function AdminBusDetailPage({
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
      <Link href={`/login?next=/admin/fleet/${id}`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view this bus
      </Link>
    );
  }

  let bus: AdminBusDetail | null = null;
  let busTypes: AdminBusType[] = [];
  let layoutCtx: AdminBusLayoutContext | null = null;
  let error: string | null = null;
  try {
    [bus, busTypes, layoutCtx] = await Promise.all([
      getAdminBus(session.access_token, id),
      listAdminBusTypes(session.access_token),
      getAdminBusLayout(session.access_token, id),
    ]);
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
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/admin/fleet"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to fleet
      </Link>

      <div className="mt-4">
        <BusDetailCard bus={bus} busTypes={busTypes} />
      </div>

      <div className="card-lg mt-6 p-6">
        <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
          Seat map
        </h2>
        <div className="mt-4">
          <SeatMapEditor
            busId={bus.id}
            initialLayout={layoutCtx?.bus_type?.layout_json ?? null}
            submittedSeatCount={layoutCtx?.bus_type?.seat_count ?? bus.bus_type?.seat_count ?? 40}
          />
        </div>
      </div>
    </div>
  );
}
