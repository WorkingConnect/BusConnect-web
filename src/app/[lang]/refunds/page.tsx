import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "Refund Policy",
  description: "How much you get back when you cancel a paid BusConnect booking, and how refunds are paid out.",
};

const TIERS = [
  { window: "24 hours or more before departure", amount: "70%", tone: "emerald" },
  { window: "10 to 24 hours before departure", amount: "50%", tone: "amber" },
  { window: "Less than 10 hours before departure", amount: "No refund", tone: "red" },
] as const;

const toneClasses: Record<(typeof TIERS)[number]["tone"], string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

export default async function RefundsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Refund Policy</h1>
      <p className="ui mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        How much of a paid booking you get back depends on how far ahead of departure you cancel. See our{" "}
        <Link href={lp("/cancellations")} className="text-brand underline dark:text-blue-400">
          Cancellation Policy
        </Link>{" "}
        for how to cancel.
      </p>

      <div className="card mt-6 divide-y divide-border overflow-hidden">
        {TIERS.map((tier) => (
          <div key={tier.window} className="flex items-center justify-between gap-4 p-5 sm:p-6">
            <span className="ui text-sm text-slate-600 dark:text-zinc-400">{tier.window}</span>
            <span className={`ui shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${toneClasses[tier.tone]}`}>
              {tier.amount}
            </span>
          </div>
        ))}
      </div>
      <p className="ui mt-2 text-xs text-slate-500 dark:text-zinc-500">
        Refund amount is a percentage of what you actually paid for that booking. Unpaid seat holds have
        nothing to refund, see the Cancellation Policy.
      </p>

      <div className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">How you get paid back</h2>
        <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          Eligible refunds are reviewed and processed by our team, either back to your original payment
          method or as credit to your BusConnect wallet. Please allow a few business days for a refund to
          be processed and to reflect on your statement.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Wallet credit</h2>
        <p className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
          If a refund is credited to your wallet instead of your original payment method, it&apos;s
          available to spend on your next booking as soon as it&apos;s credited. Check your balance under
          Wallet in the app.
        </p>
      </div>

      <p className="ui mt-8 text-sm text-slate-500 dark:text-zinc-500">
        Refund not showing up, or looks wrong? Email{" "}
        <a href="mailto:hello@busconnect.lk" className="text-brand underline dark:text-blue-400">
          hello@busconnect.lk
        </a>{" "}
        or call +94 76 467 0645 with your booking reference.
      </p>
    </div>
  );
}
