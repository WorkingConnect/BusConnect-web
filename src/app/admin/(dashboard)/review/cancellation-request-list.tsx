import { ChevronRight, ShieldAlert } from "lucide-react";
import type { AdminCancellationRequest } from "@/lib/api";

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Each row opens the trip in the admin timetable workspace (via
 *  admin/trip-enter, same as the Timetable list) — that's where the actual
 *  approve (force-cancel + refund) / reject buttons live, so this is a
 *  discovery list, not a duplicate action surface. */
export function CancellationRequestList({ requests }: { requests: AdminCancellationRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="card mt-4 p-8 text-center text-sm text-slate-500 dark:text-zinc-400">
        No pending cancellation requests.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {requests.map((r) => {
        const operatorId = r.bus?.operator?.id;
        const href = operatorId ? `/admin/trip-enter?operatorId=${operatorId}&tripId=${r.id}` : null;
        const row = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-heading font-semibold">{r.route?.name ?? "—"}</p>
                <span className="ui flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <ShieldAlert size={11} /> Pending approval
                </span>
              </div>
              <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
                {r.bus?.operator?.name ?? "—"} · Bus {r.bus?.reg_no ?? "—"} · departs {dateTime(r.depart_at)}
              </p>
              <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
                Requested {dateTime(r.cancellation_requested_at)}
                {r.cancellation_reason ? ` — "${r.cancellation_reason}"` : ""}
              </p>
            </div>
            <ChevronRight size={15} className="shrink-0 text-slate-400" />
          </>
        );
        return href ? (
          <a key={r.id} href={href} className="card card-hover flex items-center justify-between gap-3 p-4">
            {row}
          </a>
        ) : (
          <div key={r.id} className="card flex items-center justify-between gap-3 p-4">
            {row}
          </div>
        );
      })}
    </div>
  );
}
