const TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  completed: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const DEFAULT_TONE = "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400";

/** Small colored pill for trip/journey/operator status fields — reuses the
 * same tone language as the admin dashboard's stat/activity chips. */
export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`ui inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${TONE[status] ?? DEFAULT_TONE}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
