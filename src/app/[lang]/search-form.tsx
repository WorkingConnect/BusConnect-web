"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeftRight, Search } from "lucide-react";
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

/** Renders the light-mode PNG by default, swapping to the dark-mode one via
 *  the same `dark:` pattern as the header logo (src/components/logo.tsx). */
function ThemeIcon({ light, dark, size = 18 }: { light: string; dark: string; size?: number }) {
  return (
    <>
      <Image src={light} alt="" width={size} height={size} className="block dark:hidden" />
      <Image src={dark} alt="" width={size} height={size} className="hidden dark:block" />
    </>
  );
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
      <div className="relative rounded-4xl border border-border bg-card p-3 pb-6 shadow-xl shadow-black/10 sm:hidden">
        <div className="relative rounded-2xl border border-slate-300 dark:border-zinc-700">
          <div className="py-2.5 pl-4 pr-16">
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
          <div className="border-t border-slate-300 py-2.5 pl-4 pr-16 dark:border-zinc-700">
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

        <div className="mt-3 grid grid-cols-2 divide-x divide-slate-300 rounded-2xl border border-slate-300 dark:divide-zinc-700 dark:border-zinc-700">
          <div className="px-4 py-2.5">
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
          <div className="px-4 py-2.5">
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

        <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
          <button
            type="submit"
            disabled={!fromId || !toId}
            className="btn-primary min-w-44 rounded-full py-2.5 text-sm shadow-xl"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {/* Tablet/desktop — one floating card, icon+label+value sections
          divided by hairlines (redbus-style), swap button between From/To,
          a pill CTA that overlaps the card's bottom edge. This card gets an
          explicit border (unlike plain-page cards elsewhere, which rely on
          shadow alone) since it floats over a busy photo, where the shadow's
          edge alone doesn't read as clearly as it does over a flat page. */}
      <div className="hidden sm:block">
        <div className="relative rounded-4xl border border-border bg-card p-3 pb-12 shadow-xl shadow-black/10">
          <div className="flex items-stretch overflow-hidden rounded-2xl border border-slate-300 dark:border-zinc-700">
            <SearchSection
              label="From"
              icon={<ThemeIcon light="/get-on-bus-light.png" dark="/get-on-bus-dark.png" />}
              className="flex-[1.1]"
            >
              <LocationCombobox
                variant="bare"
                locations={locations}
                value={fromId}
                onChange={setFromId}
                disabled={!hasLocations}
                placeholder={hasLocations ? "Where from?" : "No locations yet"}
              />
            </SearchSection>

            <div className="flex shrink-0 items-center px-1">
              <button
                type="button"
                onClick={swap}
                aria-label="Swap origin and destination"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform duration-300 hover:rotate-180"
              >
                <ArrowLeftRight size={15} />
              </button>
            </div>

            <SearchSection
              label="To"
              icon={<ThemeIcon light="/get-off-bus-light.png" dark="/get-off-bus-dark.png" />}
              bordered
              className="flex-[1.1]"
            >
              <LocationCombobox
                variant="bare"
                locations={locations}
                value={toId}
                onChange={setToId}
                disabled={!hasLocations}
                placeholder={hasLocations ? "Where to?" : "No locations yet"}
              />
            </SearchSection>

            <SearchSection
              label="Date of journey"
              icon={<ThemeIcon light="/date-light.png" dark="/date-dark.png" />}
              bordered
              className="flex-[1.2]"
            >
              <input
                type="date"
                value={date}
                min={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full min-w-0 appearance-none bg-transparent text-base font-semibold text-foreground outline-none"
              />
            </SearchSection>

            <SearchSection
              label="Class"
              icon={<ThemeIcon light="/bus-light.png" dark="/bus-dark.png" />}
              bordered
              className="flex-[0.9]"
            >
              <select
                value={busClass}
                onChange={(e) => setBusClass(e.target.value)}
                className="w-full min-w-0 appearance-none bg-transparent text-base font-semibold text-foreground outline-none"
              >
                {BUS_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </SearchSection>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
            <button
              type="submit"
              disabled={!fromId || !toId}
              className="btn-primary min-w-64 rounded-full py-3 text-base shadow-xl"
            >
              <Search size={18} />
              Search buses
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SearchSection({
  label,
  icon,
  children,
  bordered,
  className = "",
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  bordered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 px-5 py-2.5 ${bordered ? "border-l border-slate-300 dark:border-zinc-700" : ""} ${className}`}
    >
      <span className="shrink-0 text-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="ui text-xs font-medium text-slate-500 dark:text-zinc-500">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
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

