"use client";

import { useRouter } from "next/navigation";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

export function DateFilter({ baseQuery, date }: { baseQuery: string; date: string }) {
  const router = useRouter();

  function onChange(next: string) {
    if (!next) return;
    router.push(`/search?${baseQuery}&date=${next}`);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="ui text-sm font-medium text-slate-600 dark:text-zinc-400">Filter by date</span>
      <input
        type="date"
        value={date}
        min={todayIso()}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </label>
  );
}
