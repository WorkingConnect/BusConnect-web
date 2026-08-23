"use client";

import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyReview, submitReview, ApiError } from "@/lib/api";
import { StarRatingInput } from "@/components/star-rating-input";

type State = "loading" | "idle" | "open" | "busy" | "rated";

export function RateTripButton({ tripId }: { tripId: string }) {
  const [state, setState] = useState<State>("loading");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      try {
        const existing = await getMyReview(session.access_token, tripId);
        if (cancelled) return;
        if (existing) {
          setRating(existing.rating);
          setState("rated");
        } else {
          setState("idle");
        }
      } catch {
        if (!cancelled) setState("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  async function submit() {
    setError(null);
    setState("busy");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await submitReview(session.access_token, { tripId, rating, text: text.trim() || undefined });
      setState("rated");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not submit your rating. Try again.");
      setState("open");
    }
  }

  if (state === "loading") return null;

  if (state === "rated") {
    return (
      <span className="ui inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
        <StarRatingInput value={rating} size={15} />
        Rated
      </span>
    );
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90"
      >
        <Star size={15} /> Rate this trip
      </button>
    );
  }

  return (
    <div className="card w-full p-4">
      <p className="font-medium">How was your trip?</p>
      <div className="mt-2">
        <StarRatingInput value={rating} onChange={setRating} disabled={state === "busy"} />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={state === "busy"}
        maxLength={1000}
        placeholder="Add a comment (optional)"
        rows={2}
        className="field mt-3 resize-none"
      />
      {error && <p className="ui mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={rating === 0 || state === "busy"}
          className="ui inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state === "busy" && <Loader2 size={15} className="animate-spin" />}
          {state === "busy" ? "Submitting…" : "Submit rating"}
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          disabled={state === "busy"}
          className="ui rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
