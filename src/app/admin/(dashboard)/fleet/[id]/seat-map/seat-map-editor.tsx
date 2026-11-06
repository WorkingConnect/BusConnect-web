"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, RotateCcw, Save, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateAdminBusLayout, ApiError, type SeatLayout } from "@/lib/api";
import {
  layoutToGrid,
  gridToLayout,
  countSeats,
  buildTemplateGrid,
  SEAT_TEMPLATES,
  type SeatGrid,
} from "@/lib/seat-layout";

export function SeatMapEditor({
  busId,
  initialLayout,
  submittedSeatCount,
}: {
  busId: string;
  initialLayout: SeatLayout | null;
  submittedSeatCount: number;
}) {
  const router = useRouter();
  const original = useMemo(
    () => layoutToGrid(initialLayout, submittedSeatCount),
    [initialLayout, submittedSeatCount],
  );
  const [grid, setGrid] = useState<SeatGrid>(original);
  const [dragFrom, setDragFrom] = useState<{ r: number; c: number } | null>(null);
  const [renaming, setRenaming] = useState<{ r: number; c: number } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seatCount = countSeats(grid);

  function applyTemplate(style: (typeof SEAT_TEMPLATES)[number]["style"], count: number) {
    setSaved(false);
    setGrid(buildTemplateGrid(style, count));
  }

  function resetToOriginal() {
    setSaved(false);
    setGrid(original);
  }

  function updateCell(r: number, c: number, value: string | null) {
    setSaved(false);
    setGrid((prev) => prev.map((row, ri) => (ri !== r ? row : row.map((cell, ci) => (ci === c ? value : cell)))));
  }

  function addSeat(r: number, c: number) {
    updateCell(r, c, `${r + 1}${String.fromCharCode(65 + c)}`);
  }

  function removeSeat(r: number, c: number) {
    updateCell(r, c, null);
  }

  function addRow() {
    setSaved(false);
    setGrid((prev) => {
      const last = prev[prev.length - 1] ?? [null, null, null, null];
      const newRowNum = prev.length + 1;
      let seatIdx = 0;
      const newRow = last.map((cell) => {
        if (cell === null) return null;
        seatIdx++;
        return `${newRowNum}${String.fromCharCode(64 + seatIdx)}`;
      });
      return [...prev, newRow];
    });
  }

  function removeRow() {
    setSaved(false);
    setGrid((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function addSeatToRow(r: number) {
    setSaved(false);
    setGrid((prev) =>
      prev.map((row, ri) => {
        if (ri !== r) return row;
        const seatsInRow = row.filter((c) => c !== null).length;
        return [...row, `${r + 1}${String.fromCharCode(65 + seatsInRow)}`];
      }),
    );
  }

  function removeLastCellFromRow(r: number) {
    setSaved(false);
    setGrid((prev) => prev.map((row, ri) => (ri !== r || row.length <= 1 ? row : row.slice(0, -1))));
  }

  function startRename(r: number, c: number, current: string) {
    setRenaming({ r, c });
    setRenameValue(current);
  }

  function commitRename() {
    if (renaming) updateCell(renaming.r, renaming.c, renameValue.trim() || null);
    setRenaming(null);
  }

  function onDrop(r: number, c: number) {
    if (!dragFrom) return;
    setSaved(false);
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const a = next[dragFrom.r][dragFrom.c];
      const b = next[r][c];
      next[dragFrom.r][dragFrom.c] = b;
      next[r][c] = a;
      return next;
    });
    setDragFrom(null);
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await updateAdminBusLayout(session.access_token, busId, gridToLayout(grid));
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the seat map.");
    } finally {
      setSaving(false);
    }
  }

  const countChanged = seatCount !== submittedSeatCount;

  return (
    <div>
      {/* templates */}
      <div>
        <p className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Draft templates
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SEAT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.style, t.seatCount)}
              className="ui rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={resetToOriginal}
            className="ui flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw size={12} /> Operator&apos;s original
          </button>
        </div>
      </div>

      {/* editor */}
      <div className="mt-6">
        <p className="ui text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Edit layout
        </p>
        <p className="ui mt-1 text-xs text-muted-foreground">
          Click a seat to rename it, the trash icon to remove it, a blank slot to add a seat, drag a seat
          onto another slot to swap them, and use the row controls to add or remove rows.
        </p>

        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-muted p-5">
          {grid.map((row, r) => (
            <div key={r} className="flex items-center gap-2">
              <span className="ui w-5 text-right text-[10px] text-muted-foreground">{r + 1}</span>
              {row.map((label, c) =>
                label === null ? (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addSeat(r, c)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(r, c)}
                    title="Add a seat here"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/60 transition-colors hover:border-brand hover:text-brand"
                  >
                    <Plus size={14} />
                  </button>
                ) : renaming?.r === r && renaming.c === c ? (
                  <input
                    key={c}
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => e.key === "Enter" && commitRename()}
                    className="h-9 w-9 rounded-lg border border-brand bg-card text-center text-xs font-medium text-foreground outline-none"
                  />
                ) : (
                  <span
                    key={c}
                    draggable
                    onDragStart={() => setDragFrom({ r, c })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(r, c)}
                    className="group relative flex h-9 w-9 cursor-grab items-center justify-center rounded-lg bg-brand text-xs font-medium text-brand-fg active:cursor-grabbing"
                  >
                    <button
                      type="button"
                      onClick={() => startRename(r, c, label)}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSeat(r, c)}
                      title="Remove this seat"
                      className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white group-hover:flex"
                    >
                      <Trash2 size={9} />
                    </button>
                    <GripVertical
                      size={9}
                      className="absolute -left-1 opacity-0 group-hover:opacity-60"
                    />
                  </span>
                ),
              )}
              <div className="ml-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => addSeatToRow(r)}
                  title="Add a seat to this row"
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                >
                  <Plus size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => removeLastCellFromRow(r)}
                  title="Remove the last slot in this row"
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={addRow}
              className="ui flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card"
            >
              <Plus size={12} /> Row
            </button>
            <button
              type="button"
              onClick={removeRow}
              className="ui flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card"
            >
              <Trash2 size={12} /> Row
            </button>
          </div>
        </div>
      </div>

      {/* summary + save */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="ui text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{seatCount}</span> seats
          {countChanged && (
            <span className="ml-1.5 text-amber-600 dark:text-amber-400">
              (operator submitted {submittedSeatCount})
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          {error && <span className="ui text-sm text-red-600 dark:text-red-400">{error}</span>}
          {saved && !error && <span className="ui text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>}
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
