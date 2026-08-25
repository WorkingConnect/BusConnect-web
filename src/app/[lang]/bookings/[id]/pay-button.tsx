"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { checkoutBooking, devConfirmPayment, ApiError } from "@/lib/api";

declare global {
  interface Window {
    Checkout: {
      configure: (opts: { session: { id: string } }) => Promise<void>;
      showPaymentPage: () => Promise<void>;
    };
    mpgsErrorCallback: (error: unknown) => void;
    mpgsCancelCallback: () => void;
  }
}

/** Only ever true when the page is actually loaded from localhost — this
 *  button hits a backend route that self-refuses in production regardless,
 *  but hiding it outside local dev keeps it from ever being visible on a
 *  deployed preview/staging build too. */
function isLocalDev(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "localhost";
}

let mpgsScriptPromise: Promise<void> | null = null;

/** Loads MPGS's hosted-checkout SDK once per page. data-error/data-cancel
 *  must be set on the <script> tag itself — the SDK reads them at parse
 *  time, so they can't be passed to configure() later. */
function loadMpgsScript(src: string): Promise<void> {
  if (window.Checkout) return Promise.resolve();
  if (mpgsScriptPromise) return mpgsScriptPromise;

  mpgsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-error", "mpgsErrorCallback");
    script.setAttribute("data-cancel", "mpgsCancelCallback");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment SDK."));
    document.head.appendChild(script);
  });
  return mpgsScriptPromise;
}

export function PayButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function devPay() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Your session expired. Please sign in again.");
        setBusy(false);
        return;
      }
      await devConfirmPayment(session.access_token, bookingId);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Dev confirm failed.");
      setBusy(false);
    }
  }

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Your session expired. Please sign in again.");
        setBusy(false);
        return;
      }

      const { sessionId, checkoutJsUrl } = await checkoutBooking(session.access_token, bookingId);

      // Starts DNS/TLS setup for MPGS's domain before loadMpgsScript()'s
      // <script> tag actually requests it — an external, cold-connection
      // origin, so this overlaps a real (if modest) chunk of that handshake
      // with the JS still running here rather than paying for it serially.
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = new URL(checkoutJsUrl).origin;
      document.head.appendChild(preconnect);

      // data-error / data-cancel are function *names* the MPGS SDK looks up
      // on window — not URLs. They only fire for a problem before the
      // browser leaves this page (bad/expired session); once the payer
      // reaches MPGS's own hosted page there's no client-side callback at
      // all, success/cancel/decline all redirect to our server return URL.
      window.mpgsErrorCallback = (err: unknown) => {
        console.error("MPGS error", err);
        setError("Payment could not start. Please try again.");
        setBusy(false);
      };
      window.mpgsCancelCallback = () => {
        setBusy(false);
      };

      await loadMpgsScript(checkoutJsUrl);
      await window.Checkout.configure({ session: { id: sessionId } });
      await window.Checkout.showPaymentPage(); // full-page redirect to MPGS
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start payment. Try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full">
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Redirecting to secure checkout…
          </>
        ) : (
          <>
            <CreditCard size={18} /> Pay securely with card
          </>
        )}
      </button>
      {isLocalDev() && (
        <button
          type="button"
          onClick={devPay}
          disabled={busy}
          className="ui mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <FlaskConical size={15} /> Dev: mark as paid (skip MPGS)
        </button>
      )}
      {error && <p className="ui mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
