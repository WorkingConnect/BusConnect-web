"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { scheduleTrips, ApiError, type OperatorJourney } from "@/lib/api";
import { formatTime } from "@/lib/journey-format";

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
}

function prettyDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ScheduleForm({ journeys }: { journeys: OperatorJourney[] }) {
  const router = useRouter();
  const activeJourneys = journeys.filter((j) => j.status === "active");

  const [journeyId, setJourneyId] = useState("");
  const [dateInput, setDateInput] = useState(todayIso());
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedJourney = activeJourneys.find((j) => j.id === journeyId);

  function addDate() {
    if (!dateInput) return;
    // Clear feedback from a previous submit — otherwise a stale "0
    // scheduled · N already on the calendar" banner lingers on screen while
    // the operator is clearly setting up a new attempt, reading as if it
    // describes what they're about to do rather than what already happened.
    setNotice(null);
    setError(null);
    setDates((prev) => (prev.includes(dateInput) ? prev : [...prev, dateInput].sort()));
  }
  function removeDate(d: string) {
    setDates((prev) => prev.filter((x) => x !== d));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!journeyId) return setError("Choose a journey.");
    if (dates.length === 0) return setError("Add at least one date.");

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?next=/operator/timetable");
        return;
      }
      const res = await scheduleTrips(session.access_token, { journeyId, dates });
      setDates([]);
      setNotice(
        `${res.created} trip${res.created === 1 ? "" : "s"} scheduled` +
          (res.skipped > 0 ? ` · ${res.skipped} already on the calendar` : ""),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not schedule trips. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (activeJourneys.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-500 dark:text-zinc-400">
        You have no active journeys yet. Create one in Journeys first, then schedule its dates here.
      </div>
    );
  }

  const labelCls = "ui flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-zinc-300";

  return (
    <form onSubmit={submit} className="card-lg p-6">
      <h2 className="ui text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-600">
        Schedule trips
      </h2>
      <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-500">
        Pick a journey and the dates it should run. Each date becomes a bookable trip at the journey&apos;s
        departure time.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          Journey
          <div className="relative">
            <select
              value={journeyId}
              onChange={(e) => {
                setJourneyId(e.target.value);
                setNotice(null);
                setError(null);
              }}
              className="field appearance-none pr-9 text-sm"
            >
              <option value="" disabled>
                Choose a journey…
              </option>
              {activeJourneys.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.route?.name ?? "—"} · {formatTime(j.depart_time)} · {j.bus?.reg_no ?? "—"}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />
          </div>
        </label>

        <label className={labelCls}>
          Add a date
          <div className="flex gap-2">
            <input
              type="date"
              value={dateInput}
              min={todayIso()}
              onChange={(e) => setDateInput(e.target.value)}
              className="field text-sm"
            />
            <button type="button" onClick={addDate} className="btn-secondary shrink-0 whitespace-nowrap px-3">
              <Plus size={16} /> Add
            </button>
          </div>
        </label>
      </div>

      {selectedJourney && (
        <p className="ui mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
          Departs {formatTime(selectedJourney.depart_time)} → arrives {formatTime(selectedJourney.arrive_time)} ·
          Bus {selectedJourney.bus?.reg_no ?? "—"} · LKR {Number(selectedJourney.base_fare).toLocaleString("en-LK")}
        </p>
      )}

      {dates.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dates.map((d) => (
            <span
              key={d}
              className="ui inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand dark:bg-brand-soft-dark dark:text-blue-300"
            >
              {prettyDate(d)}
              <button type="button" onClick={() => removeDate(d)} aria-label={`Remove ${d}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="ui mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && <p className="ui mt-4 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

      <button type="submit" disabled={busy} className="btn-primary mt-5">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
        {busy
          ? "Scheduling…"
          : `Schedule ${dates.length || ""} trip${dates.length === 1 ? "" : "s"}`.replace("  ", " ").trim()}
      </button>
    </form>
  );
}
