import { listOffers } from "@/lib/offers";
import { OfferCard } from "@/components/offer-card";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export const metadata = {
  title: "Offers",
  description: "Current bus ticket offers and promo codes on BusConnect.",
};

export default async function OffersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const offers = await listOffers();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{dict.home.offersTitle}</h1>

      {offers.length === 0 ? (
        <p className="ui mt-9 text-sm text-slate-500 dark:text-zinc-500">{dict.home.offersEmpty}</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              validTillLabel={dict.home.offersValidTill}
              termsLabel={dict.home.offersTerms}
              copyCodeLabel={dict.home.offersCopyCode}
              copiedLabel={dict.home.offersCopied}
            />
          ))}
        </div>
      )}
    </div>
  );
}
