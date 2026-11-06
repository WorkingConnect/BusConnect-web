"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { PREDEFINED_AMENITIES } from "@/lib/bus-constants";

export function AmenitiesPicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [customInput, setCustomInput] = useState("");
  const customAmenities = [...selected].filter((name) => !PREDEFINED_AMENITIES.includes(name));

  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  function addCustom() {
    const name = customInput.trim();
    if (!name) return;
    onChange(new Set(selected).add(name));
    setCustomInput("");
  }

  function removeCustom(name: string) {
    const next = new Set(selected);
    next.delete(name);
    onChange(next);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PREDEFINED_AMENITIES.map((name) => (
          <label
            key={name}
            className="ui flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <input
              type="checkbox"
              checked={selected.has(name)}
              onChange={() => toggle(name)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
            />
            <span className="leading-snug">{name}</span>
          </label>
        ))}
      </div>

      {customAmenities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {customAmenities.map((name) => (
            <span
              key={name}
              className="ui inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand dark:bg-brand-soft-dark dark:text-blue-300"
            >
              {name}
              <button type="button" onClick={() => removeCustom(name)} aria-label={`Remove ${name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add another amenity"
          className="field min-w-0 text-sm"
        />
        <button type="button" onClick={addCustom} className="btn-secondary shrink-0 whitespace-nowrap px-3">
          <Plus size={16} /> Add
        </button>
      </div>
    </div>
  );
}
