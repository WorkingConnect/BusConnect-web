import Link from "next/link";
import { Route as RouteIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperatorRouteCatalog, ApiError, type RouteCatalogEntry } from "@/lib/api";

export default async function OperatorRoutesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <Link href="/login?next=/operator/routes" className="font-medium text-brand underline dark:text-blue-400">
        Sign in to view routes
      </Link>
    );
  }

  let routes: RouteCatalogEntry[] = [];
  let error: string | null = null;
  try {
    routes = await getOperatorRouteCatalog(session.access_token);
  } catch (e) {
    error =
      e instanceof ApiError
        ? e.status === 403
          ? "Your account isn't linked to a bus operator."
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

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Routes</h1>
      <p className="ui mt-2 text-sm font-medium text-slate-600 dark:text-zinc-300">
        The shared route catalog. BusConnect defines routes and their stops; you can run a journey
        on any of them. To request a new route, contact BusConnect support.
      </p>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <RouteIcon size={18} className="text-brand dark:text-blue-400" />
          <h2 className="font-heading text-lg font-semibold">Routes ({routes.length})</h2>
        </div>
        {routes.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
            No routes in the catalog yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((r) => (
              <div key={r.id} className="card p-5">
                <p className="font-medium">{r.name}</p>
                <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  {r.stops.map((s) => s.location?.name_en ?? "—").join("  →  ")}
                </p>
                <p className="ui mt-1 text-xs text-slate-400 dark:text-zinc-500">{r.stops.length} stops</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
