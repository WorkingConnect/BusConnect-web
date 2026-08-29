import Link from "next/link";
import { ChevronDown, Mail, Phone } from "lucide-react";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "Help Centre",
  description: "Answers to common questions about booking, paying, cancelling, and hiring a bus on BusConnect.",
};

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border py-4 last:border-b-0">
      <summary className="ui flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
        {question}
        <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="ui mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{children}</div>
    </details>
  );
}

export default async function HelpCentrePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Help Centre</h1>
      <p className="ui mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Answers to the most common questions. Can&apos;t find what you need? Reach us directly at the
        bottom of this page.
      </p>

      <section className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Booking a ticket</h2>
        <div className="card mt-3 px-5 sm:px-6">
          <Faq question="How do I book a bus ticket?">
            <p>
              Search by route and date on the home page, pick a trip with the seats you need, choose your
              seat on the live seat map, and pay. You&apos;ll get a QR ticket immediately.
            </p>
          </Faq>
          <Faq question="Do I need to print my ticket?">
            <p>
              No, your QR ticket lives in My Tickets in the app. Just show it on your phone when boarding.
            </p>
          </Faq>
          <Faq question="Can I book more than one seat at a time?">
            <p>Yes, you can select multiple seats on the same trip in a single booking.</p>
          </Faq>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Payments &amp; wallet</h2>
        <div className="card mt-3 px-5 sm:px-6">
          <Faq question="What payment methods are supported?">
            <p>
              We support Visa, Mastercard, and JustPay from LankaPay, as well as your BusConnect wallet
              balance if you&apos;ve topped one up.
            </p>
          </Faq>
          <Faq question="What is the BusConnect wallet?">
            <p>
              A stored balance on your account that you can top up and spend on future bookings. Refunds
              can also be credited to your wallet, see the{" "}
              <Link href={lp("/refunds")} className="text-brand underline dark:text-blue-400">
                Refund Policy
              </Link>
              .
            </p>
          </Faq>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Cancellations &amp; refunds</h2>
        <div className="card mt-3 px-5 sm:px-6">
          <Faq question="How do I cancel a booking?">
            <p>
              Contact the BusConnect team on our{" "}
              <a
                href="https://wa.me/94764670645"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline dark:text-blue-400"
              >
                WhatsApp hotline
              </a>{" "}
              with the booking you&apos;d like to cancel. Full details are in our{" "}
              <Link href={lp("/cancellations")} className="text-brand underline dark:text-blue-400">
                Cancellation Policy
              </Link>
              .
            </p>
          </Faq>
          <Faq question="How much of my payment do I get back if I cancel?">
            <p>
              It depends on how far ahead of departure you cancel. See the exact tiers in our{" "}
              <Link href={lp("/refunds")} className="text-brand underline dark:text-blue-400">
                Refund Policy
              </Link>
              .
            </p>
          </Faq>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-base font-bold sm:text-lg">Hire a Bus</h2>
        <div className="card mt-3 px-5 sm:px-6">
          <Faq question="What is Hire a Bus?">
            <p>
              A classifieds board where passengers can post their own bus for private hire (weddings, tours,
              school trips) and where others can browse those listings. Posting is only available in the
              BusConnect app.
            </p>
          </Faq>
          <Faq question="Does BusConnect handle payment for a bus I hire this way?">
            <p>
              No, BusConnect only hosts the listing. You arrange price, dates, and payment directly with
              the poster. See our{" "}
              <Link href={lp("/terms")} className="text-brand underline dark:text-blue-400">
                Terms of Service
              </Link>{" "}
              for details.
            </p>
          </Faq>
        </div>
      </section>

      <section className="mt-10 card p-5 sm:p-6">
        <h2 className="font-heading text-base font-bold sm:text-lg">Still need help?</h2>
        <p className="ui mt-2 text-sm text-slate-600 dark:text-zinc-400">
          Our team is happy to help with anything not covered here.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="mailto:hello@busconnect.lk" className="btn-primary">
            <Mail size={16} /> hello@busconnect.lk
          </a>
          <a
            href="tel:+94764670645"
            className="ui inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Phone size={16} /> +94 76 467 0645
          </a>
        </div>
      </section>
    </div>
  );
}
