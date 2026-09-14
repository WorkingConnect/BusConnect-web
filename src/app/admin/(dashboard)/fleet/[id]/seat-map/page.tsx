import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminBusLayout, ApiError, type AdminBusLayoutContext } from "@/lib/api";
import { SeatMapEditor } from "./seat-map-editor";

export default async function AdminBusSeatMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href={`/login?next=/admin/fleet/${id}/seat-map`} className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let bus: AdminBusLayoutContext | null = null;
  let error: string | null = null;
  try {
    bus = await getAdminBusLayout(session.access_token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error || !bus) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/admin/fleet"
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> Back to fleet
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Seat map: {bus.reg_no}</h1>
        <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">
          {bus.operator?.name ?? "—"} · {bus.bus_type?.class.replace("_", " ") ?? "—"} · submitted as{" "}
          {bus.bus_type?.seat_count ?? "—"} seats
        </p>
      </div>

      <div className="card-lg mt-6 p-6">
        <SeatMapEditor
          busId={bus.id}
          initialLayout={bus.bus_type?.layout_json ?? null}
          submittedSeatCount={bus.bus_type?.seat_count ?? 40}
        />
      </div>
    </div>
  );
}
