"use client";

import { useState } from "react";
import Image from "next/image";
import { Tag, X } from "lucide-react";
import type { Offer, OfferTheme } from "@/lib/offers";
import { CopyCodeButton } from "./copy-code-button";

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

/** The card's visual content only — no interaction. Used standalone inside
 *  OfferCard's bottom sheet below. */
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

/** Tapping the card opens its details in a bottom sheet in place, rather
 *  than navigating away — offers are a quick "what's the code" glance, not
 *  a page worth leaving the current screen for. */
export function OfferCard({
  offer,
  validTillLabel,
  termsLabel,
  copyCodeLabel,
  copiedLabel,
  className = "",
}: {
  offer: Offer;
  validTillLabel: string;
  termsLabel: string;
  copyCodeLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block w-full text-left transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      >
        <OfferCardVisual
          offer={offer}
          validTillLabel={validTillLabel}
          className="shadow-sm shadow-black/[0.04] transition-shadow duration-200 hover:shadow-lg hover:shadow-black/[0.08]"
        />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-zinc-700 sm:hidden" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 hidden rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 sm:block"
            >
              <X size={16} />
            </button>

            <h3 className="pr-8 font-heading text-xl font-bold tracking-tight">{offer.title}</h3>

            <OfferCardVisual offer={offer} validTillLabel={validTillLabel} className="mt-4" />

            {offer.terms.length > 0 && (
              <div className="mt-5">
                <h4 className="font-heading text-sm font-bold">{termsLabel}</h4>
                <ul className="ui mt-2 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                  {offer.terms.map((term, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-zinc-600" />
                      {term}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <CopyCodeButton code={offer.code} label={copyCodeLabel} copiedLabel={copiedLabel} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
