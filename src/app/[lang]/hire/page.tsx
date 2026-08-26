import Link from "next/link";
import { Bus, MapPin, Users } from "lucide-react";
import { listHireListings, formatBusType, formatPrice } from "@/lib/hire-listings";

export const metadata = {
  title: "Hire a Bus",
  description: "Browse buses posted for private hire by their owners — weddings, school trips, tours.",
};

// Browse-only — posting only exists in BusConnect-mobile, this page (and its
// [id] detail page) never render any create/edit UI at all.
export default async function HireListingsPage() {
  const listings = await listHireListings();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Hire a Bus</h1>
        <p className="ui mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Buses posted by their owners for private hire — weddings, school trips, tours. Contact the
          poster directly to arrange price and booking.
        </p>
        <p className="ui mt-3 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-slate-600 dark:text-zinc-400">
          Posting a listing is only available in the BusConnect app.
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-slate-600 dark:text-zinc-400">No listings yet — check back soon.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/hire/${listing.id}`}
              className="card card-hover flex flex-col overflow-hidden"
            >
              <div className="relative h-40 w-full shrink-0 bg-slate-100 dark:bg-zinc-800">
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
                    <Bus size={32} className="text-white/70" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="font-heading text-base font-semibold leading-tight">{listing.title}</h2>
                <div className="ui flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {listing.city}, {listing.district}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {listing.seat_count} seats
                  </span>
                  <span className="pill">{formatBusType(listing.bus_type)}</span>
                  <span className="pill">{listing.is_ac ? "A/C" : "Non-A/C"}</span>
                </div>
                <p className="font-heading mt-auto pt-1 text-sm font-bold text-brand dark:text-blue-400">
                  {formatPrice(listing.price_amount, listing.price_type)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
