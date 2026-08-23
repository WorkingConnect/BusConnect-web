import Link from "next/link";
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
        <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {operators.map((op) => (
            <Link
              key={op.id}
              href={localizePath(locale, `/operators/${op.id}`)}
              className="card card-hover flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft dark:bg-brand-soft-dark">
                {op.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={op.logoUrl} alt={`${op.name} logo`} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-heading text-lg font-bold text-brand dark:text-blue-300">
                    {op.name.slice(0, 1)}
                  </span>
                )}
              </span>
              <p className="truncate font-heading text-sm font-semibold sm:text-base">{op.name}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
