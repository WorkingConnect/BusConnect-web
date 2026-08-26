import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "Terms of Service",
  description: "The terms that govern using BusConnect to search, book, and hire buses in Sri Lanka.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-lg font-bold tracking-tight">{title}</h2>
      <div className="ui mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Terms of Service</h1>
      <p className="ui mt-2 text-sm text-slate-500 dark:text-zinc-500">Last updated 26 August 2026</p>

      <p className="ui mt-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        These terms govern your use of BusConnect, our website and mobile app for searching, booking, and
        managing intercity bus tickets in Sri Lanka. By creating an account or booking a ticket, you agree
        to these terms.
      </p>

      <Section title="1. What BusConnect is">
        <p>
          BusConnect is a booking platform that connects passengers with independent bus operators. We
          provide seat search, online payment, and digital (QR) tickets. We do not own or operate the
          buses. Each trip is run by the operator shown on your ticket, and they&apos;re responsible for
          the journey itself (departure times, on-board conditions, driving).
        </p>
      </Section>

      <Section title="2. Accounts">
        <p>
          You&apos;re responsible for keeping your account credentials secure and for the accuracy of the
          contact details (name, phone, email) you provide. We use these to identify you at boarding and
          to reach you about your bookings.
        </p>
      </Section>

      <Section title="3. Bookings and tickets">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>A booking reserves a specific seat on a specific trip; it is not transferable to another trip or date.</li>
          <li>Your QR ticket is your proof of booking, so keep your phone charged and the ticket accessible for boarding.</li>
          <li>Operators may close new bookings on a trip at any time (e.g. once it starts boarding); this doesn&apos;t affect seats already booked.</li>
          <li>Fares, schedules, and bus types are set by the operator, not BusConnect, and can change between when you search and when you book.</li>
        </ul>
      </Section>

      <Section title="4. Payments and wallet">
        <p>
          Payments are processed through our payment gateway partner over an encrypted connection, and we
          don&apos;t store your full card details. You can also maintain a BusConnect wallet balance, top
          it up via the same gateway, and pay for bookings from it.
        </p>
      </Section>

      <Section title="5. Cancellations and refunds">
        <p>
          You can cancel a booking yourself from My Tickets any time before departure. What you get back
          depends on how close to departure you cancel. See our{" "}
          <Link href={lp("/cancellations")} className="text-brand underline dark:text-blue-400">
            Cancellation Policy
          </Link>{" "}
          and{" "}
          <Link href={lp("/refunds")} className="text-brand underline dark:text-blue-400">
            Refund Policy
          </Link>{" "}
          for details.
        </p>
      </Section>

      <Section title="6. Hire a Bus (classifieds)">
        <p>
          Hire a Bus lets passengers post their own bus for private hire and lets other passengers browse
          those listings. BusConnect only hosts the listing. We are not a party to any hire arrangement,
          don&apos;t handle payment or booking for private hires, and don&apos;t verify a poster&apos;s bus,
          identity, or pricing beyond basic moderation. Arrange and confirm every detail (price, dates,
          condition, driver) directly with the poster before paying anything, and use your own judgement,
          the same as you would with any classifieds listing.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Make bookings using false identity or payment information.</li>
          <li>Resell tickets at a markup or attempt to bypass seat-booking limits.</li>
          <li>Post a Hire a Bus listing that&apos;s fraudulent, misleading, or not your own bus to offer.</li>
          <li>Attempt to disrupt, reverse-engineer, or abuse the platform.</li>
        </ul>
        <p>We may suspend or close accounts that violate these terms.</p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          BusConnect isn&apos;t liable for delays, cancellations, or changes made by an operator, for the
          condition or conduct of a bus or driver, or for outcomes of a private hire arranged through Hire
          a Bus. Our responsibility is limited to the booking service itself.
        </p>
      </Section>

      <Section title="9. Changes to these terms">
        <p>
          We may update these terms from time to time. Continuing to use BusConnect after a change means
          you accept the updated terms.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>These terms are governed by the laws of Sri Lanka.</p>
      </Section>

      <Section title="11. Contact">
        <p>
          Questions about these terms? Reach us at{" "}
          <a href="mailto:hello@busconnect.lk" className="text-brand underline dark:text-blue-400">
            hello@busconnect.lk
          </a>{" "}
          or +94 76 467 0645.
        </p>
      </Section>
    </div>
  );
}
