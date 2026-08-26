"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HIRE_BUS_TYPES, HIRE_PRICE_TYPES, HIRE_PROVINCE_DISTRICTS } from "@/lib/hire-listings";

const MIN_SEATS_OPTIONS = [10, 20, 30, 40];

type FilterState = {
  busType: string;
  ac: string;
  province: string;
  district: string;
  priceType: string;
  minSeats: string;
};

const EMPTY_FILTERS: FilterState = { busType: "", ac: "", province: "", district: "", priceType: "", minSeats: "" };

function FilterSelect({
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="ui w-full appearance-none bg-transparent py-2.5 pl-3 pr-7 text-sm font-medium text-slate-700 outline-none disabled:opacity-40 dark:text-zinc-300"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-600"
      />
    </div>
  );
}

export function HireFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current: FilterState = {
    busType: searchParams.get("busType") ?? "",
    ac: searchParams.get("ac") ?? "",
    province: searchParams.get("province") ?? "",
    district: searchParams.get("district") ?? "",
    priceType: searchParams.get("priceType") ?? "",
    minSeats: searchParams.get("minSeats") ?? "",
  };
  const hasFilters = Object.values(current).some(Boolean);

  function apply(next: FilterState) {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setParam(key: keyof FilterState, value: string) {
    const next = { ...current, [key]: value };
    if (key === "province") next.district = "";
    apply(next);
  }

  const districts = HIRE_PROVINCE_DISTRICTS.find((p) => p.province === current.province)?.districts ?? [];

  return (
    <>
      {/* Desktop — one row of native selects */}
      <div className="mt-6 hidden flex-wrap items-stretch divide-x divide-border rounded-xl border border-border bg-muted/40 lg:flex">
        <div className="flex flex-1 pl-1">
          <FilterSelect value={current.busType} onChange={(v) => setParam("busType", v)} placeholder="Bus Type">
            {HIRE_BUS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <FilterSelect value={current.ac} onChange={(v) => setParam("ac", v)} placeholder="A/C">
          <option value="yes">A/C</option>
          <option value="no">Non-A/C</option>
        </FilterSelect>

        <FilterSelect value={current.province} onChange={(v) => setParam("province", v)} placeholder="Province">
          {HIRE_PROVINCE_DISTRICTS.map((p) => (
            <option key={p.province} value={p.province}>
              {p.province}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={current.district}
          onChange={(v) => setParam("district", v)}
          placeholder="District"
          disabled={!current.province}
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={current.priceType} onChange={(v) => setParam("priceType", v)} placeholder="Price Type">
          {HIRE_PRICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </FilterSelect>

        <div className="pr-1">
          <FilterSelect value={current.minSeats} onChange={(v) => setParam("minSeats", v)} placeholder="Min Seats">
            {MIN_SEATS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}+ seats
              </option>
            ))}
          </FilterSelect>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => apply(EMPTY_FILTERS)}
            className="ui flex items-center gap-1 pl-3 pr-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Mobile — a "Filters" trigger opening a bottom sheet, same pattern as the app */}
      <MobileHireFilters current={current} activeCount={Object.values(current).filter(Boolean).length} onApply={apply} />
    </>
  );
}

function MobileHireFilters({
  current,
  activeCount,
  onApply,
}: {
  current: FilterState;
  activeCount: number;
  onApply: (next: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterState>(current);

  function openSheet() {
    setDraft(current);
    setOpen(true);
  }

  function setDraftValue(key: keyof FilterState, value: string) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "province") next.district = "";
      return next;
    });
  }

  const draftDistricts = HIRE_PROVINCE_DISTRICTS.find((p) => p.province === draft.province)?.districts ?? [];

  return (
    <div className="mt-6 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openSheet}
          className={`ui inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            activeCount > 0
              ? "border-brand bg-brand-soft text-brand dark:border-blue-400 dark:bg-brand-soft-dark dark:text-blue-300"
              : "border-border text-foreground"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onApply(EMPTY_FILTERS)}
            className="ui text-sm font-medium text-slate-500 dark:text-zinc-500"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-heading text-base font-bold">Filters</h2>
              <button
                type="button"
                onClick={() => setDraft(EMPTY_FILTERS)}
                className="ui text-sm font-medium text-brand dark:text-blue-400"
              >
                Clear all
              </button>
            </div>

            <div className="ui flex-1 overflow-y-auto px-5 py-4">
              <ChipSection title="Bus Type">
                <ChipRow
                  options={[{ value: "", label: "Any" }, ...HIRE_BUS_TYPES]}
                  value={draft.busType}
                  onChange={(v) => setDraftValue("busType", v)}
                />
              </ChipSection>

              <ChipSection title="A/C">
                <ChipRow
                  options={[
                    { value: "", label: "Any" },
                    { value: "yes", label: "A/C" },
                    { value: "no", label: "Non-A/C" },
                  ]}
                  value={draft.ac}
                  onChange={(v) => setDraftValue("ac", v)}
                />
              </ChipSection>

              <ChipSection title="Province">
                <ChipRow
                  options={[
                    { value: "", label: "Any" },
                    ...HIRE_PROVINCE_DISTRICTS.map((p) => ({ value: p.province, label: p.province })),
                  ]}
                  value={draft.province}
                  onChange={(v) => setDraftValue("province", v)}
                />
              </ChipSection>

              {draft.province && (
                <ChipSection title="District">
                  <ChipRow
                    options={[{ value: "", label: "Any" }, ...draftDistricts.map((d) => ({ value: d, label: d }))]}
                    value={draft.district}
                    onChange={(v) => setDraftValue("district", v)}
                  />
                </ChipSection>
              )}

              <ChipSection title="Price Type">
                <ChipRow
                  options={[{ value: "", label: "Any" }, ...HIRE_PRICE_TYPES]}
                  value={draft.priceType}
                  onChange={(v) => setDraftValue("priceType", v)}
                />
              </ChipSection>

              <ChipSection title="Minimum Seats">
                <ChipRow
                  options={[
                    { value: "", label: "Any" },
                    ...MIN_SEATS_OPTIONS.map((n) => ({ value: String(n), label: `${n}+` })),
                  ]}
                  value={draft.minSeats}
                  onChange={(v) => setDraftValue("minSeats", v)}
                />
              </ChipSection>
            </div>

            <div className="border-t border-border p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <button
                type="button"
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
                className="btn-primary w-full justify-center"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="ui text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`ui rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-brand bg-brand text-white"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
