import Link from "next/link";
import Image from "next/image";
import { Tag } from "lucide-react";
import type { Offer, OfferTheme } from "@/lib/offers";
import { localizePath } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/config";

const THEME_BG: Record<OfferTheme, string> = {
  amber: "bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-950/40 dark:to-orange-950/30",
  yellow: "bg-gradient-to-br from-yellow-200 to-amber-300 dark:from-yellow-950/40 dark:to-amber-950/30",
  pink: "bg-gradient-to-br from-rose-100 to-pink-200 dark:from-rose-950/40 dark:to-pink-950/30",
  blue: "bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-950/40 dark:to-blue-950/30",
  green: "bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-950/40 dark:to-green-950/30",
};

export function formatValidTill(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** The card's visual content only — no link. Used standalone at the top of
 *  the offer detail page (which IS that link's destination), and wrapped in
 *  a Link by OfferCard everywhere else (homepage carousel, /offers grid). */
export function OfferCardVisual({
  offer,
  validTillLabel,
  className = "",
}: {
  offer: Offer;
  validTillLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-sm shadow-black/[0.04] ${THEME_BG[offer.theme]} ${className}`}
    >
      <div>
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 dark:text-zinc-50">
          {offer.title}
        </h3>
        <p className="ui mt-1.5 text-xs text-slate-600 dark:text-zinc-400">
          {validTillLabel} {formatValidTill(offer.validTill)}
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <span className="ui inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm dark:bg-black/30 dark:text-zinc-50">
          <Tag size={13} />
          {offer.code}
        </span>
        {offer.imageUrl && (
          <div className="relative h-10 w-16 shrink-0">
            <Image src={offer.imageUrl} alt="" fill sizes="64px" className="object-contain object-right" />
          </div>
        )}
      </div>
    </div>
  );
}

export function OfferCard({
  offer,
  locale,
  validTillLabel,
  className = "",
}: {
  offer: Offer;
  locale: Locale;
  /** e.g. dict.home.offersValidTill ("Valid till") */
  validTillLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={localizePath(locale, `/offers/${offer.id}`)}
      className="block transition-transform duration-200 hover:-translate-y-0.5"
    >
      <OfferCardVisual
        offer={offer}
        validTillLabel={validTillLabel}
        className={`shadow-sm shadow-black/[0.04] transition-shadow duration-200 hover:shadow-lg hover:shadow-black/[0.08] ${className}`}
      />
    </Link>
  );
}
