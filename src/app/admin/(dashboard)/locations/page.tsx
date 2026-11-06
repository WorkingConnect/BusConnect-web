import Link from "next/link";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdminLocations, listAdminRoutes, ApiError, type AdminLocation, type AdminRoute } from "@/lib/api";
import { KpiCard } from "../dashboard-ui";
import { LocationList } from "./location-list";

export default async function AdminLocationsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/admin/locations" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to access the admin dashboard
      </Link>
    );
  }

  let locations: AdminLocation[] = [];
  let routes: AdminRoute[] = [];
  let error: string | null = null;
  try {
    [locations, routes] = await Promise.all([
      listAdminLocations(session.access_token),
      listAdminRoutes(session.access_token),
    ]);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account does not have admin access."
          : e.message
        : "Could not reach BusConnect-api. Is it running?";
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </p>
    );
  }

  const visibleCount = locations.filter((l) => l.is_public).length;
  const hiddenCount = locations.length - visibleCount;

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Locations</h1>
      <p className="ui mt-1 text-sm text-muted-foreground">
        Every stop created via the route editor, grouped by the route it&apos;s on. Hide a location to pull
        it from the public From/To search without touching the routes it&apos;s already on.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <KpiCard icon={<MapPin size={16} />} tone="blue" label="Total" value={String(locations.length)} />
        <KpiCard icon={<Eye size={16} />} tone="emerald" label="Visible" value={String(visibleCount)} />
        <KpiCard icon={<EyeOff size={16} />} tone="slate" label="Hidden" value={String(hiddenCount)} />
      </div>

      <LocationList locations={locations} routes={routes} />
    </div>
  );
}
