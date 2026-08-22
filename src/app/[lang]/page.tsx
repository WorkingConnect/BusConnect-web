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
import { listPopularRoutes, formatDuration } from "@/lib/popular-routes";
import { SearchForm } from "./search-form";
import { SectionHeading } from "@/components/ui";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  const [locations, popularRoutes] = await Promise.all([listLocations(), listPopularRoutes()]);
  return (
    <>
      <Hero locations={locations} dict={dict} />
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
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-soft/50 via-transparent to-transparent dark:from-brand-soft-dark/25" />

      <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <h1 className="font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {dict.home.heroTitlePrefix}{" "}
              <span className="text-brand dark:text-blue-400">{dict.home.heroTitleAccent}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-zinc-400 sm:text-lg">
              {dict.home.heroSubtitle}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/hero-image.png"
                alt="Passengers boarding a BusConnect bus"
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-contain"
                priority
              />
            </div>

            <div className="absolute left-0 top-4 hidden items-center gap-2.5 rounded-2xl bg-card px-4 py-3 shadow-xl shadow-black/10 sm:flex lg:-left-6 lg:top-10 dark:shadow-black/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                <Ticket size={17} />
              </span>
              <div>
                <p className="font-heading text-sm font-bold leading-none">Instant QR ticket</p>
                <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">Scan & board</p>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 hidden items-center gap-2.5 rounded-2xl bg-card px-4 py-3 shadow-xl shadow-black/10 sm:flex lg:-right-4 lg:bottom-4 dark:shadow-black/40">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
                <Armchair size={17} />
              </span>
              <div>
                <p className="font-heading text-sm font-bold leading-none">Live seat maps</p>
                <p className="ui mt-0.5 text-xs text-slate-500 dark:text-zinc-500">Pick your exact seat</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/10 sm:p-6 dark:shadow-black/40">
          <SearchForm locations={locations} />
          {locations.length === 0 && (
            <p className="ui mt-3 text-center text-sm text-slate-500 dark:text-zinc-500">{dict.home.searchEmpty}</p>
          )}
        </div>
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
      <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8">
      <SectionHeading id="routes" title={dict.home.popularRoutesTitle} centered />
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
