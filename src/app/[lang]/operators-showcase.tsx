import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { SectionHeading } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";
import type { OperatorSummary } from "@/lib/operators";

/** Homepage directory of active operators — pick one to see their fleet and routes. */
export function OperatorsShowcase({
  operators,
  dict,
  locale,
}: {
  operators: OperatorSummary[];
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8">
      <SectionHeading
        id="operators-showcase"
        title={dict.home.operatorsShowcaseTitle}
        subtitle={dict.home.operatorsShowcaseSubtitle}
        centered
      />
      {operators.length === 0 ? (
        <p className="ui mt-9 text-sm text-slate-500 dark:text-zinc-500">{dict.home.noOperators}</p>
      ) : (
        <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((op) => (
            <Link
              key={op.id}
              href={localizePath(locale, `/operators/${op.id}`)}
              className="card card-hover flex items-center gap-4 p-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white dark:bg-zinc-900">
                {op.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={op.logoUrl} alt={`${op.name} logo`} className="h-full w-full object-contain p-1.5" />
                ) : (
                  <span className="font-heading text-lg font-bold text-brand dark:text-blue-300">
                    {op.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-semibold sm:text-base">{op.name}</p>
                <p className="ui mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-500">
                  <Star
                    size={12}
                    className={op.rating > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-zinc-700"}
                  />
                  {op.rating.toFixed(1)}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-zinc-700" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
