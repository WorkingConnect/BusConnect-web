import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOffer } from "@/lib/offers";
import { OfferCardVisual } from "@/components/offer-card";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import { CopyCodeButton } from "@/components/copy-code-button";

export default async function OfferPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const offer = await getOffer(id);

  if (!offer) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {dict.home.offersNotFound}
        </p>
        <Link
          href={localizePath(locale, "/offers")}
          className="ui mt-4 inline-block text-sm font-medium text-brand underline dark:text-blue-400"
        >
          {dict.home.offersTitle}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:pb-10 lg:px-8">
      <Link
        href={localizePath(locale, "/offers")}
        className="ui inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
      >
        <ArrowLeft size={15} /> {dict.home.offersTitle}
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{offer.title}</h1>

      <OfferCardVisual offer={offer} validTillLabel={dict.home.offersValidTill} className="mt-6" />

      {offer.terms.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-lg font-bold tracking-tight">{dict.home.offersTerms}</h2>
          <ul className="ui mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            {offer.terms.map((term, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-zinc-600" />
                {term}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sticky on mobile so the CTA stays reachable without scrolling back up;
          static in the flow on larger screens where there's room to spare. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-4 sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-3xl sm:mx-0">
          <CopyCodeButton
            code={offer.code}
            label={dict.home.offersCopyCode}
            copiedLabel={dict.home.offersCopied}
          />
        </div>
      </div>
    </div>
  );
}
