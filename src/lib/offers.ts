import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';

export type OfferTheme = 'amber' | 'yellow' | 'pink' | 'blue' | 'green';

export interface Offer {
  id: string;
  title: string;
  code: string;
  validTill: string;
  terms: string[];
  theme: OfferTheme;
  imageUrl: string | null;
}

interface OfferRow {
  id: string;
  title: string;
  code: string;
  valid_till: string;
  terms: string[] | null;
  theme: OfferTheme;
  image_url: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Offers for the homepage "Offers for you" carousel and its detail page.
 * RLS on `offers` (0099_offers.sql) already restricts the anon client to
 * `is_active` rows; the `valid_till` filter here additionally drops ones
 * that are still marked active but have quietly expired, so admin doesn't
 * have to remember to flip is_active off on the day a promo ends.
 *
 * Display-only: copying a code doesn't validate or apply a discount
 * anywhere in the booking flow yet — see 0099_offers.sql's docstring.
 */
export const listOffers = unstable_cache(
  async (): Promise<Offer[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('offers')
      .select('id, title, code, valid_till, terms, theme, image_url')
      .gte('valid_till', todayIso())
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('listOffers: could not load offers —', error.message);
      return [];
    }
    return ((data ?? []) as unknown as OfferRow[]).map((o) => ({
      id: o.id,
      title: o.title,
      code: o.code,
      validTill: o.valid_till,
      terms: o.terms ?? [],
      theme: o.theme,
      imageUrl: o.image_url,
    }));
  },
  ['offers'],
  { revalidate: 60 },
);

export async function getOffer(id: string): Promise<Offer | null> {
  const offers = await listOffers();
  return offers.find((o) => o.id === id) ?? null;
}
