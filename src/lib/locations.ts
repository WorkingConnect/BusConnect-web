import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

export interface Location {
  id: string;
  name_en: string;
  name_si: string | null;
  name_ta: string | null;
}

/**
 * Reads the bookable location catalog directly from Supabase (public read
 * under RLS — see supabase/migrations/0003_rls.sql). This is a display
 * read, so it bypasses BusConnect-api per the read/write split in
 * docs/PRODUCT_AND_TECH_PLAN.md §4.2.
 *
 * Scoped to list_bookable_locations() (0084) rather than the raw
 * `locations` table, so the From/To pickers only ever offer stops that are
 * actually on a route with a currently bookable trip — not every location
 * ever created.
 *
 * Cached across requests — the catalog changes rarely, and re-fetching it on
 * every single page load added a real Supabase round-trip to every
 * request's TTFB for no benefit.
 */
export const listLocations = unstable_cache(
  async (): Promise<Location[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc('list_bookable_locations');

    if (error) {
      // Expected on a fresh Supabase project before BusConnect-api's migrations
      // have been applied — degrade to an empty list rather than a 500 page.
      console.error('listLocations: falling back to empty list —', error.message);
      return [];
    }
    return data ?? [];
  },
  ['locations'],
  { revalidate: 300 },
);
