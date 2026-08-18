import { layoutToGrid, countSeats } from "@/lib/seat-layout";
import type { SeatLayout } from "@/lib/api";

/** Read-only rendering of a bus's seat layout — no interactivity, no booking states. */
export function SeatGridPreview({ layout, seatCount }: { layout: SeatLayout | null; seatCount: number }) {
  const grid = layoutToGrid(layout, seatCount);
  const total = countSeats(grid);

  return (
    <div>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        {grid.map((row, r) => (
          <div key={r} className="flex items-center gap-2">
            {row.map((label, c) =>
              label === null ? (
                <div key={c} className="h-9 w-9" />
              ) : (
                <span
                  key={c}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-xs font-medium text-brand-fg"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        ))}
      </div>
      <p className="ui mt-3 text-sm text-slate-600 dark:text-zinc-400">
        <span className="font-semibold text-slate-900 dark:text-white">{total}</span> seats
      </p>
    </div>
  );
}
