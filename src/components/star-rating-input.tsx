"use client";

import { Star } from "lucide-react";

export function StarRatingInput({
  value,
  onChange,
  disabled,
  size = 22,
}: {
  value: number;
  onChange?: (n: number) => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={n === value}
          disabled={disabled || !onChange}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange?.(n)}
          className="disabled:cursor-default"
        >
          <Star
            size={size}
            className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-zinc-600"}
          />
        </button>
      ))}
    </div>
  );
}
