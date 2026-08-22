import type { ReactNode } from "react";

/** White/dark rounded date badge for poster-style cards. */
export function DateBadge({ iso }: { iso: string }) {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate();
  return (
    <div className="ui w-12 overflow-hidden rounded-xl bg-card text-center shadow-lg dark:shadow-black/40">
      <div className="bg-brand py-0.5 text-[10px] font-bold tracking-wide text-brand-fg">
        {month}
      </div>
      <div className="py-1 font-heading text-xl font-bold leading-none text-foreground">
        {day}
      </div>
    </div>
  );
}

/** Section heading with an optional small icon badge. */
export function SectionHeading({
  icon,
  title,
  subtitle,
  id,
  centered,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  id?: string;
  centered?: boolean;
}) {
  return (
    <div id={id} className={`scroll-mt-28 ${centered ? "text-center" : ""}`}>
      <div className={`flex items-center gap-2.5 ${centered ? "justify-center" : ""}`}>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand dark:bg-brand-soft-dark dark:text-blue-300">
            {icon}
          </span>
        )}
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {subtitle && <p className="mt-2 text-slate-600 dark:text-zinc-400">{subtitle}</p>}
    </div>
  );
}
