import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "Cancellation Policy",
  description: "How to cancel a BusConnect booking, and what happens when you do.",
};

export default async function CancellationsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Cancellation Policy</h1>
      <p className="ui mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        To cancel a booking, contact the BusConnect team on our WhatsApp hotline.
      </p>

      <div className="card mt-6 p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold sm:text-lg">How to cancel</h2>
        <ol className="ui mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          <li>
            1. Message us on WhatsApp at{" "}
            <a
              href="https://wa.me/94764670645"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline dark:text-blue-400"
            >
              +94 76 467 0645
            </a>
            .
          </li>
          <li>2. Tell us the booking you&apos;d like to cancel.</li>
          <li>3. Our team cancels it and confirms once it&apos;s done.</li>
        </ol>
        <p className="ui mt-3 text-sm text-slate-600 dark:text-zinc-400">
          Your seat is released and your ticket is voided once the cancellation is processed.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-heading text-base font-bold">Before departure</h2>
          </div>
          <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            A booking can be cancelled any time up until the trip departs. If you paid for the booking,
            cancelling triggers a refund based on how close to departure you cancel. See our{" "}
            <Link href={lp("/refunds")} className="text-brand underline dark:text-blue-400">
              Refund Policy
            </Link>
            .
          </p>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-600 dark:text-red-400" />
            <h2 className="font-heading text-base font-bold">After departure</h2>
          </div>
          <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            Once a trip has departed, bookings on it can no longer be cancelled through the app. Contact
            support if something went wrong on the day of travel.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Unpaid seat holds</h2>
        <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          If you selected a seat but didn&apos;t complete payment, that reservation was never charged.
          Cancelling or simply letting it expire releases the seat at no cost. Since nothing was paid,
          there&apos;s nothing to refund.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">If bookings are closed on a trip</h2>
        <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          Operators can close new bookings on a trip (for example, once boarding starts). This only stops
          <em> new</em> passengers from booking that trip. It has no effect on seats you&apos;ve already
          booked, and doesn&apos;t cancel anything on your behalf.
        </p>
      </div>

      <p className="ui mt-8 text-sm text-slate-500 dark:text-zinc-500">
        Questions about a specific booking? Email{" "}
        <a href="mailto:hello@busconnect.lk" className="text-brand underline dark:text-blue-400">
          hello@busconnect.lk
        </a>{" "}
        or call +94 76 467 0645.
      </p>
    </div>
  );
}
