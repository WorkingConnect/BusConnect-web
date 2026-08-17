"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** The seat hold behind this booking runs out ~8 minutes after the seats
 *  were first selected (create_booking() links the same seat_holds rows, it
 *  doesn't reset their TTL) — count it down so the payer knows the seats can
 *  be given back to someone else. Mirrors the mobile app's checkout screen. */
export function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setSecondsLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft === null) return null;
  const expired = secondsLeft === 0;

  return (
    <div className="mt-4">
      <p
        className={
          expired
            ? "flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400"
            : "flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400"
        }
      >
        <Clock size={14} />
        {expired ? "Seat hold expired" : `Seats held for ${formatCountdown(secondsLeft)}`}
      </p>
      {expired && (
        <p className="ui mt-1 text-xs text-slate-500 dark:text-zinc-400">
          These seats may have been given to someone else.{" "}
          <button
            type="button"
            onClick={() => router.back()}
            className="font-medium text-brand underline dark:text-blue-400"
          >
            Go back and select seats again
          </button>
          .
        </p>
      )}
    </div>
  );
}
