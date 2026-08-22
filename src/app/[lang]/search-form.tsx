"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Bus, Calendar, MapPin, Search } from "lucide-react";
import type { Location } from "@/lib/locations";

const BUS_CLASSES = [
  { value: "", label: "Any class" },
  { value: "super_luxury", label: "Super Luxury" },
  { value: "luxury", label: "Luxury (A/C)" },
  { value: "semi_luxury", label: "Semi Luxury" },
  { value: "normal", label: "Normal" },
] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SearchForm({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [fromId, setFromId] = useState(locations[0]?.id ?? "");
  const [toId, setToId] = useState(locations[1]?.id ?? locations[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());
  const [busClass, setBusClass] = useState("");

  const hasLocations = locations.length > 0;

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams({ from: fromId, to: toId, date });
    if (busClass) qs.set("class", busClass);
    router.push(`/search?${qs.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Mobile — stacked cards, Busbud-style: From/To share one card split by
          a divider (with a diamond swap button straddling it), Date/Class
          share a second card side by side, then a full-width pill button. */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="relative rounded-2xl border border-border bg-card">
          <div className="p-4 pr-16">
            <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">From</p>
            <LocationCombobox
              variant="bare"
              locations={locations}
              value={fromId}
              onChange={setFromId}
              disabled={!hasLocations}
              placeholder={hasLocations ? "Where from?" : "No locations yet"}
            />
          </div>
          <div className="border-t border-border p-4 pr-16">
            <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">To</p>
            <LocationCombobox
              variant="bare"
              locations={locations}
              value={toId}
              onChange={setToId}
              disabled={!hasLocations}
              placeholder={hasLocations ? "Where to?" : "No locations yet"}
            />
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 rotate-45 items-center justify-center rounded-lg border border-border bg-card text-slate-500 shadow-sm dark:text-zinc-400"
          >
            <ArrowLeftRight size={15} className="-rotate-45" />
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border bg-card">
          <div className="p-4">
            <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">Date</p>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full min-w-0 appearance-none bg-transparent text-base text-foreground outline-none"
            />
          </div>
          <div className="p-4">
            <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">Class</p>
            <select
              value={busClass}
              onChange={(e) => setBusClass(e.target.value)}
              className="mt-1 w-full min-w-0 appearance-none bg-transparent text-base text-foreground outline-none"
            >
              {BUS_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!fromId || !toId}
          className="btn-primary w-full rounded-full py-3.5 text-base"
        >
          <Search size={18} />
          Search
        </button>
      </div>

      {/* Tablet/desktop — single thin row. */}
      <div className="hidden grid-cols-1 items-end gap-3 sm:grid lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] lg:gap-2">
        <Field label="From" icon={<MapPin size={15} />}>
          <LocationCombobox
            locations={locations}
            value={fromId}
            onChange={setFromId}
            disabled={!hasLocations}
            placeholder={hasLocations ? "Where from?" : "No locations yet"}
          />
        </Field>

        <button
          type="button"
          onClick={swap}
          aria-label="Swap origin and destination"
          className="hidden h-11.5 w-11.5 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 text-slate-500 transition-colors duration-300 hover:bg-slate-50 hover:text-brand dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 lg:flex"
        >
          <ArrowLeftRight size={16} />
        </button>

        <Field label="To" icon={<MapPin size={15} />}>
          <LocationCombobox
            locations={locations}
            value={toId}
            onChange={setToId}
            disabled={!hasLocations}
            placeholder={hasLocations ? "Where to?" : "No locations yet"}
          />
        </Field>

        <Field label="Date" icon={<Calendar size={15} />}>
          <input
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            required
            className="field w-full min-w-0 py-3"
          />
        </Field>

        <Field label="Class" icon={<Bus size={15} />}>
          <select
            value={busClass}
            onChange={(e) => setBusClass(e.target.value)}
            className="field w-full min-w-0 appearance-none py-3"
          >
            {BUS_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" disabled={!fromId || !toId} className="btn-primary py-3">
          <Search size={17} />
          Search
        </button>
      </div>
    </form>
  );
}

function LocationCombobox({
  locations,
  value,
  onChange,
  disabled,
  placeholder,
  variant = "boxed",
}: {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** "bare" drops the border/background — for use inside a shared card
   *  (the mobile stacked-card search layout) rather than as its own box. */
  variant?: "boxed" | "bare";
}) {
  const [query, setQuery] = useState(() => locations.find((l) => l.id === value)?.name_en ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the displayed text in sync when the selected id changes from
  // outside (e.g. the swap button) — adjust during render rather than in an
  // effect, per React's "adjusting state when a prop changes" pattern.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(locations.find((l) => l.id === value)?.name_en ?? "");
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations.slice(0, 8);
    return locations
      .filter(
        (l) =>
          l.name_en.toLowerCase().includes(q) ||
          l.name_si?.includes(query.trim()) ||
          l.name_ta?.includes(query.trim()),
      )
      .slice(0, 8);
  }, [locations, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(loc: Location) {
    onChange(loc.id);
    setQuery(loc.name_en);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const loc = results[highlight];
      if (loc) pick(loc);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
          if (e.target.value === "") onChange("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={
          variant === "bare"
            ? "mt-1 w-full min-w-0 appearance-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            : "field appearance-none py-3"
        }
      />
      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
          {results.map((loc, i) => (
            <li key={loc.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(loc)}
                className={`ui block w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted ${
                  i === highlight ? "bg-muted" : ""
                }`}
              >
                {loc.name_en}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
      <span className="ui flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 sm:text-sm">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
