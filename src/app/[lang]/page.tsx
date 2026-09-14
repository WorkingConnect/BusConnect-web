import Link from "next/link";
import Image from "next/image";
import {
  Armchair,
  ShieldCheck,
  Ticket,
  MapPinned,
  Languages,
  RefreshCw,
} from "lucide-react";
import { listLocations } from "@/lib/locations";
import { listPopularRoutes } from "@/lib/popular-routes";
import { listActiveOperators } from "@/lib/operators";
import { RouteCard } from "@/components/route-card";
import { SearchForm } from "./search-form";
import { OperatorsShowcase } from "./operators-showcase";
import { SectionHeading } from "@/components/ui";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const [locations, popularRoutes, operators] = await Promise.all([
    listLocations(),
    listPopularRoutes(),
    listActiveOperators(),
  ]);
  return (
    <>
      <Hero locations={locations} dict={dict} />
      <AppPromo dict={dict} />
      <PopularRoutes routes={popularRoutes} dict={dict} locale={locale} />
      <OperatorsShowcase operators={operators} dict={dict} locale={locale} />
      <HowItWorks />
      <OperatorCta dict={dict} />
      <Features />
    </>
  );
}

/* ── Hero + search widget ──────────────────────────────────────────────── */
function Hero({
  locations,
  dict,
}: {
  locations: Awaited<ReturnType<typeof listLocations>>;
  dict: Dictionary;
}) {
  return (
    <section className="relative">
      {/* Full-bleed banner photo, text directly on it (redbus-style, no box).
          A soft left-to-right dark gradient keeps the white text legible over
          the busier left side of hero.jpg without the heaviness of a panel;
          drop-shadow on the text carries the rest. The search bar overlaps
          the bottom edge, so the band is kept short. */}
      <div className="relative h-56 w-full overflow-hidden sm:h-64 lg:h-72">
        <Image src="/hero.jpg" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />

        <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl [text-shadow:0_1px_12px_rgb(0_0_0_/_0.45)]">
            <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {dict.home.heroTitlePrefix} {dict.home.heroTitleAccent}
            </h1>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="-mt-12 sm:-mt-14">
          <SearchForm locations={locations} />
          {locations.length === 0 && (
            <p className="ui mt-3 text-center text-sm text-slate-500 dark:text-zinc-500">{dict.home.searchEmpty}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── App download promo ────────────────────────────────────────────────── */
const IOS_APP_STORE_URL = "https://apps.apple.com/app/busconnect/id6794645415";
const ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=lk.busconnect.app";

function AppPromo({ dict }: { dict: Dictionary }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-2 sm:px-6 lg:px-8">
      <div className="relative rounded-3xl bg-brand-soft/70 p-6 dark:bg-brand-soft-dark/30 sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-8 sm:text-left lg:pr-36">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-lg shadow-black/10 sm:h-20 sm:w-20">
              <Image src="/app-icon.png" alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                {dict.home.appPromoTitle}
              </h3>
              <p className="mt-1.5 max-w-md text-sm text-slate-600 dark:text-zinc-400 sm:text-base">
                {dict.home.appPromoBody}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex shrink-0 items-center gap-3">
            <a
              href={IOS_APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="relative h-11 w-[124px] transition-opacity hover:opacity-80"
            >
              <Image src="/app-store.png" alt={dict.home.appStoreAlt} fill sizes="124px" className="object-contain" />
            </a>
            <a
              href={ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="relative h-11 w-[124px] transition-opacity hover:opacity-80"
            >
              <Image src="/google-play.png" alt={dict.home.playStoreAlt} fill sizes="124px" className="object-contain" />
            </a>
          </div>
        </div>

        {/* Anchored to the card's bottom but taller than it — deliberately
            not clipped, so he stands "over" the card's top edge rather than
            stretching the card to fit him. */}
        <Image
          src="/man.png"
          alt=""
          width={356}
          height={540}
          className="pointer-events-none absolute bottom-0 right-4 hidden h-40 w-auto object-contain object-bottom lg:block lg:right-8 lg:h-56"
        />
      </div>
    </section>
  );
}

/* ── Feature grid ──────────────────────────────────────────────────────── */
function Features() {
  const features = [
    [Armchair, "Real-time seat maps", "Pick your exact seat before you pay."],
    [ShieldCheck, "Secure payments", "Pay by card, eZ Cash or bank securely."],
    [Ticket, "Instant e-tickets", "QR e-ticket by SMS the moment you pay."],
    [MapPinned, "Live bus tracking", "Track your bus with live arrival times."],
    [Languages, "Three languages", "Book in English, Sinhala or Tamil."],
    [RefreshCw, "Easy refunds", "Cancel or reschedule in a tap."],
  ] as const;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading title="Why BusConnect" centered />
      <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {features.map(([Icon, title, body]) => (
          <div key={title} className="card card-hover p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300 sm:h-9 sm:w-9">
              <Icon size={16} className="sm:hidden" />
              <Icon size={18} className="hidden sm:block" />
            </span>
            <h3 className="mt-3 font-heading text-sm font-semibold sm:text-base">{title}</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 sm:text-sm">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Popular routes ────────────────────────────────────────────────────── */
function PopularRoutes({
  routes,
  dict,
  locale,
}: {
  routes: Awaited<ReturnType<typeof listPopularRoutes>>;
  dict: Dictionary;
  locale: Locale;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8">
      <SectionHeading id="routes" title={dict.home.popularRoutesTitle} centered />
      {routes.length === 0 ? (
        <p className="ui mt-9 text-sm text-slate-500 dark:text-zinc-500">{dict.home.noRoutes}</p>
      ) : (
        <div className="scrollbar-none -mx-4 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {routes.map((r) => (
            <RouteCard
              key={r.routeCardId ?? r.routeId}
              route={r}
              dict={dict}
              locale={locale}
              todayIso={today}
              className="w-[78vw] shrink-0 snap-start sm:w-80"
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── How it works ──────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    ["Search", "Enter your route and date to see every available bus."],
    ["Pick your seat", "Choose your exact seat on a live, real-time seat map."],
    ["Pay securely", "Pay by card, eZ Cash or bank in a few taps."],
    ["Board with QR", "Get your e-ticket instantly and scan it to board."],
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading id="how" title="How to book a ticket" centered />
      <div className="card mt-9 flex flex-col divide-y divide-slate-100 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-zinc-800">
        {steps.map(([title, body], i) => (
          <div key={title} className="flex-1 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-heading font-bold text-brand-fg">
              {i + 1}
            </span>
            <h3 className="mt-4 font-heading font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Operator CTA ──────────────────────────────────────────────────────── */
function OperatorCta({ dict }: { dict: Dictionary }) {
  return (
    <section id="operators" className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
      <div
        className="overflow-hidden rounded-3xl p-8 sm:p-12"
        style={{ background: "linear-gradient(135deg, #004aad 0%, #05235a 100%)" }}
      >
        <div className="max-w-2xl">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {dict.home.operatorCtaTitle}
          </h2>
          <p className="mt-3 text-white/80">{dict.home.operatorCtaBody}</p>
          <Link
            href="/operator"
            className="ui mt-6 inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand transition-colors duration-300 hover:bg-white/90"
          >
            {dict.home.operatorCtaButton}
          </Link>
        </div>
      </div>
    </section>
  );
}
