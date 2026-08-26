import Link from "next/link";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import {
  getHireListing,
  formatBusType,
  formatCondition,
  formatDriverIncluded,
  formatFeature,
  formatSuitableFor,
  formatPrice,
  getContactVisibility,
} from "@/lib/hire-listings";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import { stripCountryCode } from "@/lib/phone";
import { ImageGallery } from "./image-gallery";

// Same pill style as the operator amenities section
// (src/app/[lang]/operators/[id]/page.tsx) — bg-muted pill, no icon.
function InfoPill({ label }: { label: string }) {
  return (
    <span className="ui inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
      {label}
    </span>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.52 3.633 1.417 5.134L2 22l5.008-1.394A9.94 9.94 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12.001 2zm0 18.09a8.06 8.06 0 0 1-4.393-1.297l-.315-.188-3.16.878.86-3.13-.203-.32A8.058 8.058 0 0 1 3.909 12c0-4.464 3.628-8.09 8.092-8.09 4.464 0 8.09 3.626 8.09 8.09 0 4.464-3.626 8.09-8.09 8.09z" />
    </svg>
  );
}

/** "0712345678" -> "071 234 5678"; anything that isn't a 10-digit Sri
 *  Lankan number just passes through unchanged. */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

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

  // Posters type the local format ("0771234567"); wa.me needs the country
  // code with no leading 0, so strip whatever prefix is there and add
  // +94's digits back on.
  const whatsappDigits = listing.contact_whatsapp
    ? `94${stripCountryCode(listing.contact_whatsapp)}`
    : undefined;
  const { showCall, showWhatsapp } = getContactVisibility(listing);

  const badgeParts = [
    formatBusType(listing.bus_type) ?? listing.bus_type,
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

      <div className="mt-4">
        <ImageGallery images={listing.images} title={listing.title} />

        <div className="card mt-6 divide-y divide-border overflow-hidden">
          <div className="p-5 sm:p-6">
            <p className="font-heading text-2xl font-bold text-brand dark:text-blue-400">
              {formatPrice(listing.price_amount, listing.price_type)}
            </p>
            <h1 className="font-heading mt-1 text-xl font-bold tracking-tight">{listing.title}</h1>
            <div className="ui mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
              <MapPin size={14} />
              {listing.city}, {listing.district}, {listing.province}
            </div>
            <div className="ui mt-3 flex flex-wrap gap-2">
              {badgeParts.map((part) => (
                <InfoPill key={part} label={part} />
              ))}
            </div>
          </div>

          {detailRows.length > 0 && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">Details</h2>
              <dl className="mt-3 divide-y divide-border">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                    <dt className="text-slate-600 dark:text-zinc-400">{row.label}</dt>
                    <dd className="font-heading font-bold">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {listing.features.length > 0 && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">Features &amp; Facilities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.features.map((f) => (
                  <InfoPill key={f} label={formatFeature(f)} />
                ))}
              </div>
            </div>
          )}

          {listing.suitable_for.length > 0 && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">Suitable For</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.suitable_for.map((s) => (
                  <InfoPill key={s} label={formatSuitableFor(s)} />
                ))}
              </div>
            </div>
          )}

          {listing.description && (
            <div className="p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold sm:text-lg">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        <div className="card mt-6 p-5 sm:p-6">
          <p className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
            Contact {listing.contact_name}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {showCall && (
              <a href={`tel:${listing.contact_phone}`} className="btn-primary">
                <Phone size={16} /> {formatPhone(listing.contact_phone)}
              </a>
            )}
            {showWhatsapp && whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noreferrer"
                className="ui inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <WhatsAppIcon size={16} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
