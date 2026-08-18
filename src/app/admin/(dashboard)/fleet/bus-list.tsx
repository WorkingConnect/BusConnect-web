"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import type { AdminBus } from "@/lib/api";
import { StatusActions } from "./status-actions";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export function BusList({ buses }: { buses: AdminBus[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter(
      (b) => b.reg_no.toLowerCase().includes(q) || (b.operator?.name.toLowerCase().includes(q) ?? false),
    );
  }, [buses, query]);

  return (
    <div>
      <div className="relative mt-6">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search buses by registration no. or operator…"
          className="field pl-9 text-sm focus:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
            {buses.length === 0 ? "No buses registered yet." : `No buses match "${query}".`}
          </div>
        ) : (
          filtered.map((b) => <BusRow key={b.id} bus={b} />)
        )}
      </div>
    </div>
  );
}

function BusRow({ bus: b }: { bus: AdminBus }) {
  const photos: [string, string | null | undefined][] = [
    ["Front", b.front_image_url],
    ["Side 1", b.side_image_urls?.[0]],
    ["Side 2", b.side_image_urls?.[1]],
    ["Interior", b.interior_image_url],
    ["Seat layout", b.seat_layout_image_url],
  ];

  return (
    <div className="card card-hover flex items-start justify-between gap-4 p-4">
      <Link href={`/admin/fleet/${b.id}`} className="flex flex-1 items-start gap-3">
        {b.front_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.front_image_url}
            alt={`${b.reg_no} front`}
            className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-zinc-800"
          />
        ) : (
          <div className="h-14 w-20 shrink-0 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{b.reg_no}</p>
            <span className={`ui rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[b.status]}`}>
              {b.status}
            </span>
          </div>
          <p className="ui mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
            {b.operator?.name ?? "—"} · {b.bus_type?.name ?? "—"} · {b.bus_type?.seat_count ?? "—"} seats
          </p>
          {b.amenities.length > 0 && (
            <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">{b.amenities.join(", ")}</p>
          )}
          {b.notes && <p className="ui mt-1 text-xs italic text-slate-500 dark:text-zinc-500">&ldquo;{b.notes}&rdquo;</p>}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusActions busId={b.id} status={b.status} />
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
          {photos.map(([label, url]) =>
            url ? (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline dark:text-blue-400"
              >
                {label}
              </a>
            ) : null,
          )}
        </div>
        <Link
          href={`/admin/fleet/${b.id}`}
          className="ui mt-1 flex items-center gap-0.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
        >
          Details <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
