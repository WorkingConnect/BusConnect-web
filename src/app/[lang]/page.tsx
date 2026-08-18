import Link from "next/link";
import {
  Armchair,
  ShieldCheck,
  Ticket,
  MapPinned,
  Languages,
  RefreshCw,
} from "lucide-react";
import { listLocations } from "@/lib/locations";
import { listPopularRoutes, formatDuration } from "@/lib/popular-routes";
import { SearchForm } from "./search-form";
import { SectionHeading } from "@/components/ui";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import { HeroVideo } from "./hero-video";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const [locations, popularRoutes] = await Promise.all([listLocations(), listPopularRoutes()]);
  return (
    <>
      <Hero locations={locations} dict={dict} />
      <Stats />
      <PopularRoutes routes={popularRoutes} dict={dict} locale={locale} />
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
    <section className="relative flex min-h-[100dvh] items-start overflow-hidden sm:min-h-screen sm:items-center">
      {/* Full-screen background video, swapped per theme + breakpoint. Only
          one <video> is ever mounted (picked in JS) so the browser fetches a
          single ~5-30MB clip instead of all four candidates at once. */}
      <HeroVideo />
      {/* Scrim so heading/search text stays readable over the moving footage,
          fading into the page background at the bottom edge. */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/25" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-white dark:h-32 dark:to-background" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mt-2 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-white sm:mt-5 sm:text-6xl sm:text-foreground">
            {dict.home.heroTitlePrefix}{" "}
            <span className="text-blue-400 sm:text-brand sm:dark:text-blue-400">{dict.home.heroTitleAccent}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-normal text-zinc-300 sm:mt-4 sm:text-lg sm:font-medium sm:text-slate-800 sm:dark:font-normal sm:dark:text-zinc-400">
            {dict.home.heroSubtitle}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-lg border border-white/30 p-3 sm:mt-9 sm:border-border sm:bg-card/40 sm:p-6 sm:shadow-sm sm:shadow-black/[0.04] sm:backdrop-blur-md sm:transition-colors sm:duration-300 sm:dark:shadow-none">
          <SearchForm locations={locations} />
          {locations.length === 0 && (
            <p className="ui mt-3 text-center text-sm text-zinc-500 sm:text-slate-500 sm:dark:text-zinc-500">
              {dict.home.searchEmpty}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Trust stats ───────────────────────────────────────────────────────── */
function Stats() {
  const stats = [
    ["50+", "Routes"],
    ["3", "Languages"],
    ["24/7", "Support"],
    ["100%", "Secure"],
  ];
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="card px-4 py-5 text-center">
            <div className="font-heading text-2xl font-bold text-brand dark:text-blue-400 sm:text-3xl">
              {value}
            </div>
            <div className="ui mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-500">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Feature grid ──────────────────────────────────────────────────────── */
function Features() {
  const features = [
    [Armchair, "Real-time seat maps", "See exactly which seats are free and pick yours before you pay — no double bookings, ever."],
    [ShieldCheck, "Secure payments", "Pay by card, eZ Cash or bank through PCI-compliant gateways. Your money is protected."],
    [Ticket, "Instant e-tickets", "Get a QR e-ticket by SMS and email the moment you pay. Scan and board — even offline."],
    [MapPinned, "Live bus tracking", "Follow your bus on the map with predicted arrival at your boarding point."],
    [Languages, "Three languages", "Book fully in English, Sinhala or Tamil — whichever you prefer."],
    [RefreshCw, "Easy refunds", "Cancel or reschedule yourself in a tap. No phone calls, no queues."],
  ] as const;

  return (
    <section className="mx-auto hidden max-w-7xl px-4 py-14 sm:block sm:px-6 lg:px-8">
      <SectionHeading
        title="Why BusConnect"
        subtitle="Everything the old booking sites do,done smarter, faster and in your language."
      />
      <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {features.map(([Icon, title, body]) => (
          <div key={title} className="card card-hover p-4 sm:p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300 sm:h-11 sm:w-11">
              <Icon size={18} className="sm:hidden" />
              <Icon size={21} className="hidden sm:block" />
            </span>
            <h3 className="mt-3 font-heading text-base font-semibold sm:mt-4 sm:text-lg">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400 sm:mt-1.5">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Popular routes ────────────────────────────────────────────────────── */
/** "tomorrow" / "in 2 days" / "Fri, 2 Aug" for a yyyy-mm-dd relative to today. */
function relativeDateLabel(dateIso: string, todayIso: string) {
  const days = Math.round(
    (new Date(`${dateIso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000,
  );
  if (days === 1) return "tomorrow";
  if (days > 1 && days <= 6) return `in ${days} days`;
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "short" });
}

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
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeading
        id="routes"
        title={dict.home.popularRoutesTitle}
        subtitle={dict.home.popularRoutesSubtitle}
      />
      {routes.length === 0 ? (
        <p className="ui mt-9 text-sm text-slate-500 dark:text-zinc-500">{dict.home.noRoutes}</p>
      ) : (
        <div className="scrollbar-none -mx-4 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {routes.map((r) => {
            const dur = formatDuration(r.durationMinutes);
            const query = r.routeCardId ? `routeCardId=${r.routeCardId}` : `routeId=${r.routeId}`;
            return (
              <Link
                key={r.routeCardId ?? r.routeId}
                href={localizePath(locale, `/search?${query}&date=${today}`)}
                className="card card-hover group w-[78vw] shrink-0 snap-start overflow-hidden sm:w-80"
              >
                <div className="relative">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt={r.name}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-brand to-blue-800">
                      <MapPinned size={28} className="text-white/40" />
                    </div>
                  )}
                  {/* Floating stat badge, ticket-stub style */}
                  <div className="absolute left-4 top-4 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5">
                    <p className="ui bg-brand px-3 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
                      {dict.home.today}
                    </p>
                    <p className="bg-white px-3 py-1.5 text-center dark:bg-zinc-900">
                      <span className="font-heading text-lg font-extrabold leading-none text-slate-900 dark:text-white">
                        {r.todayCount}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="truncate font-heading text-lg font-bold tracking-tight">{r.name}</h3>
                  <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    {r.todayCount > 0
                      ? `${r.todayCount} ${r.todayCount === 1 ? "trip" : "trips"} today${dur ? ` · ${dur}` : ""}`
                      : r.nextDateIso
                        ? `Next trip ${relativeDateLabel(r.nextDateIso, today)}${dur ? ` · ${dur}` : ""}`
                        : dict.home.noBusesScheduled}
                  </p>

                  <div className="my-3.5 border-t border-dashed border-slate-200 dark:border-zinc-800" />

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      {r.minFare != null ? (
                        <>
                          <p className="ui text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                            LKR
                          </p>
                          <p className="font-heading text-xl font-extrabold leading-none text-brand dark:text-blue-400">
                            {r.minFare.toLocaleString("en-LK", { maximumFractionDigits: 0 })}
                          </p>
                          <p className="ui text-[10px] text-slate-400 dark:text-zinc-500">{dict.home.onwards}</p>
                        </>
                      ) : (
                        <p className="ui text-xs text-slate-400 dark:text-zinc-500">{dict.home.noBusesScheduled}</p>
                      )}
                    </div>
                    <span className="btn-primary shrink-0 px-4 py-2 text-sm transition-transform group-hover:translate-x-0.5">
                      {dict.nav.searchBuses}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
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
      <SectionHeading id="how" title="How it works" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, body], i) => (
          <div key={title} className="card p-6">
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
