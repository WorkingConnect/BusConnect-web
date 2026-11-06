"use client";

import { ImagePlus, Upload, X } from "lucide-react";

export function ImageSlot({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="ui flex flex-col gap-2 text-sm font-medium text-foreground">
      {label}
      <div className="flex flex-col gap-2.5 rounded-xl bg-muted p-2.5">
        <div className="relative h-24 w-full">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={`${label} preview`}
                className="h-24 w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label={`Remove ${label} photo`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-colors hover:opacity-80"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
              <ImagePlus size={18} />
            </div>
          )}
        </div>
        <label className="ui inline-flex w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg transition-colors hover:bg-brand/90">
          <Upload size={13} />
          {preview ? "Change photo" : "Choose photo"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
