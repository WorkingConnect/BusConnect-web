import { Card } from "@/components/ui/card";

/** Compact metric card used across the operator dashboard (Overview, Pilots,
 *  Fleet, …) — small uppercase label + icon, a bold number, optional meta
 *  line. `feature` elevates one card in solid brand color as the headline
 *  metric (e.g. "Net earned"). */
export function KpiCard({
  icon,
  label,
  value,
  meta,
  metaIcon,
  feature,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  meta?: string;
  metaIcon?: React.ReactNode;
  feature?: boolean;
}) {
  return (
    <Card className={feature ? "bg-brand text-brand-fg dark:border-brand" : undefined}>
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className={`ui text-[10px] font-semibold uppercase tracking-wide ${feature ? "text-white/75" : "text-muted-foreground"}`}>
            {label}
          </span>
          <span className={feature ? "text-white/80" : "text-muted-foreground"}>{icon}</span>
        </div>
        <p className={`font-heading mt-1.5 font-bold tracking-tight tabular-nums ${feature ? "text-base" : "text-xl"}`}>
          {value}
        </p>
        {meta && (
          <p className={`ui mt-0.5 flex items-center gap-1 text-[11px] ${feature ? "text-white/70" : "text-muted-foreground"}`}>
            {metaIcon}
            {meta}
          </p>
        )}
      </div>
    </Card>
  );
}

/** Bare centered icon + heading + subtext for an empty list/section. */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      {icon}
      <p className="mt-4 font-heading font-semibold">{title}</p>
      <p className="ui mt-1 text-sm text-slate-600 dark:text-zinc-400">{subtitle}</p>
      {action}
    </div>
  );
}
