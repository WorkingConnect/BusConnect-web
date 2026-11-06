import { Card } from "@/components/ui/card";

/** Compact metric card used across the admin dashboard — small uppercase
 *  label + icon, a bold number, optional meta line. Mirrors the operator
 *  dashboard's KpiCard so both workspaces read as one system. */
export function KpiCard({
  icon,
  tone,
  label,
  value,
  meta,
}: {
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "purple" | "slate";
  label: string;
  value: string;
  meta?: string;
}) {
  const TONE: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300",
    slate: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <div className="px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="ui text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONE[tone]}`}>{icon}</span>
        </div>
        <p className="font-heading mt-1.5 text-xl font-bold tracking-tight tabular-nums">{value}</p>
        {meta && <p className="ui mt-0.5 text-[11px] text-muted-foreground">{meta}</p>}
      </div>
    </Card>
  );
}

/** Bare centered icon + heading + subtext for an empty list/section. */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="card p-10 text-center">
      {icon}
      <p className="mt-4 font-heading font-semibold">{title}</p>
      <p className="ui mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
