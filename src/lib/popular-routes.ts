import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

export interface PopularRoute {
  /** Set when this card groups one or more routes sharing a route card —
   *  link to it with `?routeCardId=`. Null for a card-less route, which
   *  links with `?routeId=` (routeId) instead. */
  routeCardId: string | null;
  /** A representative route in this group — the link target when routeCardId is null. */
  routeId: string;
  name: string;
  durationMinutes: number | null;
  /** Total upcoming trips (any day) — used for popularity ranking. */
  tripCount: number;
  /** Trips departing today (Asia/Colombo calendar day) — what the card's "Today" badge shows. */
  todayCount: number;
  /** Calendar date (Asia/Colombo, yyyy-mm-dd) of the soonest upcoming trip, if any. */
  nextDateIso: string | null;
  imageUrl: string | null;
  minFare: number | null;
}

interface RouteRow {
  id: string;
  name: string;
  image_url: string | null;
  route_card_id: string | null;
}

/** One row of popular_route_card_activity() — see 0062_route_card_popularity.sql. */
interface ActivityRow {
  route_card_id: string | null;
  route_id: string | null;
  trip_count: number;
  today_count: number;
  next_date: string | null;
  min_duration_minutes: number | null;
  min_fare: number | null;
}

type GroupAgg = {
  routeCardId: string | null;
  routeId: string;
  name: string;
  durationMinutes: number | null;
  count: number;
  todayCount: number;
  nextDateIso: string | null;
  imageUrl: string | null;
  minFare: number | null;
};

/**
 * "Popular routes" for the homepage. Every route admin has published is
 * guaranteed to appear — seeded straight from the shared route catalog —
 * regardless of whether any operator has scheduled a trip on it yet. Cards
 * WITH real upcoming trips (active operators only) are ranked above ones
 * without, by how many trips actually exist for that group; this is live
 * marketplace data layered on top of the catalog, not a fixed editorial
 * list.
 *
 * Routes sharing a route card (e.g. two operators both running
 * "Colombo - Jaffna" over physically different stops) are merged into one
 * card here, keyed by route_card_id — a card-less route is its own
 * one-route group instead, keyed by its own id. See
 * popular_route_card_activity() in 0062_route_card_popularity.sql.
 *
 * The underlying fetch+aggregation is cached across requests (see
 * `getAllPopularRoutes` below) since this data doesn't need per-request
 * freshness and re-running it on every page load added a real Supabase
 * round-trip to every request's TTFB.
 */
export async function listPopularRoutes(limit?: number): Promise<PopularRoute[]> {
  const all = await getAllPopularRoutes();
  return limit != null ? all.slice(0, limit) : all;
}

const getAllPopularRoutes = unstable_cache(
  async (): Promise<PopularRoute[]> => {
    const supabase = createPublicClient();
    const byGroup = new Map<string, GroupAgg>();

    // The route catalog and trip activity are independent reads — run them
    // concurrently instead of one after another to halve the round-trip cost.
    const [
      { data: routes, error: routesErr },
      { data: activity, error: activityErr },
    ] = await Promise.all([
      // 1. Seed with EVERY published route, so a brand-new route with zero
      //    trips still shows up.
      supabase.from('routes').select('id, name, image_url, route_card_id'),
      // 2. Real upcoming-trip activity per route-card group, to rank groups
      //    + estimate duration/fare.
      supabase.rpc('popular_route_card_activity'),
    ]);
    if (routesErr) {
      console.error('listPopularRoutes: could not load the route catalog —', routesErr.message);
    }
    if (activityErr) {
      console.error('listPopularRoutes: could not load trip activity —', activityErr.message);
    }

    for (const r of (routes ?? []) as unknown as RouteRow[]) {
      const key = r.route_card_id ?? `route:${r.id}`;
      const existing = byGroup.get(key);
      if (existing) {
        if (!existing.imageUrl && r.image_url) existing.imageUrl = r.image_url;
      } else {
        byGroup.set(key, {
          routeCardId: r.route_card_id,
          routeId: r.id,
          name: r.name,
          durationMinutes: null,
          count: 0,
          todayCount: 0,
          nextDateIso: null,
          imageUrl: r.image_url,
          minFare: null,
        });
      }
    }

    for (const row of (activity ?? []) as unknown as ActivityRow[]) {
      const key = row.route_card_id ?? `route:${row.route_id}`;
      const existing = byGroup.get(key);
      if (!existing) continue; // only card known catalog groups, not orphaned trip data
      existing.count = row.trip_count;
      existing.todayCount = row.today_count;
      existing.nextDateIso = row.next_date;
      existing.durationMinutes = row.min_duration_minutes;
      existing.minFare = row.min_fare;
    }

    const sorted = [...byGroup.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );

    return sorted.map((r) => ({
      routeCardId: r.routeCardId,
      routeId: r.routeId,
      name: r.name,
      durationMinutes: r.durationMinutes,
      tripCount: r.count,
      todayCount: r.todayCount,
      nextDateIso: r.nextDateIso,
      imageUrl: r.imageUrl,
      minFare: r.minFare,
    }));
  },
  ['popular-routes'],
  { revalidate: 60 },
);

export function formatDuration(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
