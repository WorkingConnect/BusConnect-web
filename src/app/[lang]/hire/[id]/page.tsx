import Link from "next/link";
import { ChevronRight, Bus, MapPin, Phone, MessageCircle } from "lucide-react";
import {
  getHireListing,
  formatBusType,
  formatCondition,
  formatDriverIncluded,
  formatFeature,
  formatSuitableFor,
  formatPrice,
} from "@/lib/hire-listings";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

// Browse-only, same as the listing page — no edit/delete/status UI here at
// all, posting only exists in BusConnect-mobile.
export default async function HireListingPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const listing = await getHireListing(id);

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          This listing isn&apos;t available anymore.
        </p>
        <Link
          href={localizePath(locale, "/hire")}
          className="ui mt-4 inline-block text-sm font-medium text-brand underline dark:text-blue-400"
        >
          Back to listings
        </Link>
      </div>
    );
  }

  const whatsappDigits = listing.contact_whatsapp?.replace(/\D/g, "");

  const badgeParts = [
    formatBusType(listing.bus_type),
    `${listing.seat_count} seats`,
    listing.is_ac ? "A/C" : "Non-A/C",
    listing.condition ? formatCondition(listing.condition) : null,
    listing.driver_included ? formatDriverIncluded(listing.driver_included) : null,
  ].filter((p): p is string => !!p);

  const detailRows = [
    listing.bus_model ? { label: "Bus Model", value: listing.bus_model } : null,
    listing.manufacturing_year ? { label: "Manufacturing Year", value: String(listing.manufacturing_year) } : null,
    listing.min_hire_duration ? { label: "Minimum Hire Duration", value: listing.min_hire_duration } : null,
    listing.area ? { label: "Service Area", value: listing.area } : null,
  ].filter((r): r is { label: string; value: string } => !!r);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="ui flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
        <Link href={localizePath(locale, "/hire")} className="hover:text-slate-900 dark:hover:text-white">
          Hire a Bus
        </Link>
        <ChevronRight size={12} />
        <span className="font-medium text-slate-700 dark:text-zinc-300">{listing.title}</span>
      </nav>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        {listing.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800 sm:grid-cols-3">
            {listing.images.slice(0, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt={`${listing.title} photo ${i + 1}`}
                className={`h-40 w-full object-cover ${i === 0 ? "col-span-2 h-64 sm:col-span-2" : ""}`}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex h-56 w-full items-center justify-center"
            style={{ background: "linear-gradient(135deg, #004aad 0%, #062b63 100%)" }}
          >
            <Bus size={40} className="text-white/70" />
          </div>
        )}
      </div>

      <p className="font-heading mt-6 text-2xl font-bold text-brand dark:text-blue-400">
        {formatPrice(listing.price_amount, listing.price_type)}
      </p>
      <h1 className="font-heading mt-1 text-xl font-bold tracking-tight">{listing.title}</h1>

      <div className="ui mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
        <MapPin size={14} />
        {listing.city}, {listing.district}, {listing.province}
      </div>

      <div className="ui mt-3 flex flex-wrap gap-2">
        {badgeParts.map((part) => (
          <span key={part} className="pill">
            {part}
          </span>
        ))}
      </div>

      {detailRows.length > 0 && (
        <div className="card mt-6 divide-y divide-border overflow-hidden">
          {detailRows.map((row) => (
            <div key={row.label} className="ui flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500 dark:text-zinc-400">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {listing.features.length > 0 && (
        <div className="mt-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Features & Facilities
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.features.map((f) => (
              <span key={f} className="pill">
                {formatFeature(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {listing.suitable_for.length > 0 && (
        <div className="mt-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Suitable For
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {listing.suitable_for.map((s) => (
              <span key={s} className="pill">
                {formatSuitableFor(s)}
              </span>
            ))}
          </div>
        </div>
      )}

      {listing.description && (
        <div className="mt-6">
          <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            {listing.description}
          </p>
        </div>
      )}

      <div className="card mt-8 p-5">
        <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">
          Contact {listing.contact_name}
        </p>
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
          BusConnect doesn&apos;t handle payment or booking for private hires — arrange details directly.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`tel:${listing.contact_phone}`} className="btn-primary">
            <Phone size={16} /> Call {listing.contact_phone}
          </a>
          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              className="ui inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
