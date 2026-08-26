"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { OperatorFooterLink } from "./operator-footer-link";
import { useT, useLocale } from "@/lib/i18n/provider";
import { localizePath } from "@/lib/i18n/navigation";
import { localeNames, locales } from "@/lib/i18n/config";

// lucide-react dropped brand/logo icons a while back, so Facebook and
// Instagram are hand-drawn glyphs here (same approach as the Google icon
// on the login page).
function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteFooter() {
  const t = useT("footer");
  const tn = useT("nav");
  const locale = useLocale();
  const lp = (path: string) => localizePath(locale, path);

  return (
    <footer className="mt-24 border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Columns */}
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-xs">
            <Logo href={lp("/")} />
            <p className="ui mt-4 text-sm leading-relaxed text-muted-foreground">{t("brandBlurb")}</p>
            <div className="mt-5 flex gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <FacebookIcon />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <InstagramIcon />
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-bold">{t("explore")}</h4>
            <ul className="ui mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
              <li>
                <Link href={lp("/")} className="transition-colors hover:text-foreground">
                  {tn("searchBuses")}
                </Link>
              </li>
              <li>
                <Link href={lp("/#routes")} className="transition-colors hover:text-foreground">
                  {tn("popularRoutes")}
                </Link>
              </li>
              <li>
                <Link href={lp("/#how")} className="transition-colors hover:text-foreground">
                  {tn("howItWorks")}
                </Link>
              </li>
              <OperatorFooterLink />
            </ul>
          </div>
          <FooterCol
            title={t("support")}
            links={[
              [t("helpCentre"), lp("/help")],
              [t("refunds"), lp("/refunds")],
              [t("cancellations"), lp("/cancellations")],
              [t("terms"), lp("/terms")],
            ]}
          />

          <div>
            <h4 className="font-heading text-sm font-bold">{t("contact")}</h4>
            <ul className="ui mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-brand dark:text-blue-400" /> +94 76 467 0645
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-brand dark:text-blue-400" /> hello@busconnect.lk
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={16} className="text-brand dark:text-blue-400" /> Colombo, Sri Lanka
              </li>
            </ul>
          </div>
        </div>

        <div className="ui flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} BusConnect · {t("poweredBy")}
          </p>
          <p>
            {t("availableIn")} {locales.map((l) => localeNames[l]).join(" · ")}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-bold">{title}</h4>
      <ul className="ui mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
