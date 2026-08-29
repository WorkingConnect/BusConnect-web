import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Bus, MapPin, Users, ChevronRight } from "lucide-react";
import { listHireListings, formatBusType, formatCondition, formatDriverIncluded, formatPrice } from "@/lib/hire-listings";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import { HireFilters } from "./hire-filters";

// Same pill style as the operator amenities section
// (src/app/[lang]/operators/[id]/page.tsx) — bg-muted pill, no icon.
function InfoPill({ label }: { label: string }) {
  return (
    <span className="ui inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
      {label}
    </span>
  );
}

// Same store-badge assets/links as the homepage's AppPromo section
// (src/app/[lang]/page.tsx) — iOS link is still a "#" placeholder there
// until the app is published on App Store Connect.
const IOS_APP_STORE_URL = "#";
const ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=lk.busconnect.app";

function AppPromoBar() {
  return (
    <div className="ui flex flex-wrap items-center gap-4 rounded-2xl bg-brand px-5 py-4">
      <div className="flex items-center gap-3">
        <Image src="/app-icon.png" alt="BusConnect app" width={40} height={40} className="shrink-0 rounded-lg" />
        <p className="text-sm font-semibold text-white">Post your ad? Get the BusConnect app.</p>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={IOS_APP_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="relative h-11 w-[124px] transition-opacity hover:opacity-80"
        >
          <Image src="/app-store.png" alt="Download on the App Store" fill sizes="124px" className="object-contain" />
        </a>
        <a
          href={ANDROID_PLAY_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="relative h-11 w-[124px] transition-opacity hover:opacity-80"
        >
          <Image src="/google-play.png" alt="Get it on Google Play" fill sizes="124px" className="object-contain" />
        </a>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Hire a Bus",
  description: "Browse buses posted for private hire by their owners — weddings, school trips, tours.",
};

// Browse-only — posting only exists in BusConnect-mobile, this page (and its
// [id] detail page) never render any create/edit UI at all.
export default async function HireListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    busType?: string;
    ac?: string;
    province?: string;
    district?: string;
    priceType?: string;
    minSeats?: string;
  }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const filters = await searchParams;
  const minSeats = filters.minSeats ? Number(filters.minSeats) : null;

  const allListings = await listHireListings();
  const listings = allListings.filter((l) => {
    if (filters.busType && l.bus_type !== filters.busType) return false;
    if (filters.ac === "yes" && !l.is_ac) return false;
    if (filters.ac === "no" && l.is_ac) return false;
    if (filters.province && l.province !== filters.province) return false;
    if (filters.district && l.district !== filters.district) return false;
    if (filters.priceType && l.price_type !== filters.priceType) return false;
    if (minSeats && l.seat_count < minSeats) return false;
    return true;
  });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Hire a Bus</h1>
          <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">Browse busses for trips and tours</p>
        </div>
        <AppPromoBar />
      </div>

      <Suspense>
        <HireFilters />
      </Suspense>

      {listings.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-slate-600 dark:text-zinc-400">
            {hasFilters ? "No listings match your filters." : "No listings yet — check back soon."}
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={localizePath(locale, `/hire/${listing.id}`)}
              className="card card-hover flex items-center overflow-hidden"
            >
              <div className="relative aspect-square w-32 shrink-0 bg-slate-100 sm:aspect-[4/3] sm:w-48 dark:bg-zinc-800">
                {listing.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
                  >
                    <Bus size={28} className="text-white/70" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
                <h2 className="font-heading truncate text-base font-semibold leading-tight">{listing.title}</h2>
                <div className="ui flex items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {listing.city}, {listing.district}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {listing.seat_count} seats
                  </span>
                </div>
                <div className="ui flex flex-wrap items-center gap-1.5">
                  <InfoPill label={formatBusType(listing.bus_type) ?? listing.bus_type} />
                  <InfoPill label={listing.is_ac ? "A/C" : "Non-A/C"} />
                  {listing.condition && <InfoPill label={formatCondition(listing.condition) ?? listing.condition} />}
                  {listing.driver_included && (
                    <InfoPill label={formatDriverIncluded(listing.driver_included) ?? listing.driver_included} />
                  )}
                </div>
                <p className="font-heading text-sm font-bold text-brand dark:text-blue-400">
                  {formatPrice(listing.price_amount, listing.price_type)}
                </p>
              </div>
              <div className="ui hidden shrink-0 items-center gap-1.5 self-center pr-5 text-sm font-semibold text-brand sm:flex dark:text-blue-400">
                View Details
                <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
