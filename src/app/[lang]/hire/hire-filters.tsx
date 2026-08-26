"use client";

import { ChevronDown, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { HIRE_BUS_TYPES, HIRE_PRICE_TYPES, HIRE_PROVINCE_DISTRICTS } from "@/lib/hire-listings";

const MIN_SEATS_OPTIONS = [10, 20, 30, 40];

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

  const busType = searchParams.get("busType") ?? "";
  const ac = searchParams.get("ac") ?? "";
  const province = searchParams.get("province") ?? "";
  const district = searchParams.get("district") ?? "";
  const priceType = searchParams.get("priceType") ?? "";
  const minSeats = searchParams.get("minSeats") ?? "";

  const districts = HIRE_PROVINCE_DISTRICTS.find((p) => p.province === province)?.districts ?? [];
  const hasFilters = !!(busType || ac || province || district || priceType || minSeats);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "province") params.delete("district");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mt-6 flex flex-wrap items-stretch divide-x divide-border rounded-xl border border-border bg-muted/40">
      <div className="flex flex-1 pl-1">
        <FilterSelect value={busType} onChange={(v) => setParam("busType", v)} placeholder="Bus Type">
          {HIRE_BUS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      <FilterSelect value={ac} onChange={(v) => setParam("ac", v)} placeholder="A/C">
        <option value="yes">A/C</option>
        <option value="no">Non-A/C</option>
      </FilterSelect>

      <FilterSelect value={province} onChange={(v) => setParam("province", v)} placeholder="Province">
        {HIRE_PROVINCE_DISTRICTS.map((p) => (
          <option key={p.province} value={p.province}>
            {p.province}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        value={district}
        onChange={(v) => setParam("district", v)}
        placeholder="District"
        disabled={!province}
      >
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect value={priceType} onChange={(v) => setParam("priceType", v)} placeholder="Price Type">
        {HIRE_PRICE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </FilterSelect>

      <div className="pr-1">
        <FilterSelect value={minSeats} onChange={(v) => setParam("minSeats", v)} placeholder="Min Seats">
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
          onClick={() => router.push(pathname, { scroll: false })}
          className="ui flex items-center gap-1 pl-3 pr-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
