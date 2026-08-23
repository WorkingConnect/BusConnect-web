import Link from "next/link";
import { MapPinned } from "lucide-react";
import { formatDuration, type PopularRoute } from "@/lib/popular-routes";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

/** "tomorrow" / "in 2 days" / "Fri, 2 Aug" for a yyyy-mm-dd relative to today. */
export function relativeDateLabel(dateIso: string, todayIso: string) {
  const days = Math.round(
    (new Date(`${dateIso}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000,
  );
  if (days === 1) return "tomorrow";
  if (days > 1 && days <= 6) return `in ${days} days`;
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("en-LK", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * A single "poster" route card — image, today's trip count, fare and a
 * search CTA. Shared by the homepage's Popular Routes strip and an
 * operator's profile page; `className` controls layout only (e.g. the
 * homepage's horizontal snap-scroll sizing vs. a plain grid cell elsewhere).
 */
export function RouteCard({
  route: r,
  dict,
  locale,
  todayIso,
  className = "",
}: {
  route: PopularRoute;
  dict: Dictionary;
  locale: Locale;
  todayIso: string;
  className?: string;
}) {
  const dur = formatDuration(r.durationMinutes);
  const query = r.routeCardId ? `routeCardId=${r.routeCardId}` : `routeId=${r.routeId}`;

  return (
    <Link
      href={localizePath(locale, `/search?${query}&date=${todayIso}`)}
      className={`card card-hover group overflow-hidden ${className}`}
    >
      <div className="relative">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt={r.name} className="aspect-video w-full object-cover" />
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
              ? `Next trip ${relativeDateLabel(r.nextDateIso, todayIso)}${dur ? ` · ${dur}` : ""}`
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
}
