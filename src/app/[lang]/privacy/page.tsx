import Link from "next/link";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "Privacy Policy",
  description: "How BusConnect collects, uses, and protects your information.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-lg font-bold tracking-tight">{title}</h2>
      <div className="ui mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Privacy Policy</h1>
      <p className="ui mt-2 text-sm text-slate-500 dark:text-zinc-500">Last updated 27 August 2026</p>

      <p className="ui mt-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        This policy explains what information BusConnect collects through our website and mobile app, why
        we collect it, and how it&apos;s used. Using BusConnect means you&apos;re okay with the practices
        described here.
      </p>

      <Section title="1. Information you give us">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Full name, phone number, and NIC, used to identify you at boarding and on your ticket.</li>
          <li>Email address, if you add one, for account recovery and receipts.</li>
          <li>A profile photo, if you choose to set one.</li>
          <li>
            If you post a Hire a Bus listing, the contact details you enter (name, phone, WhatsApp number)
            are shown to other users browsing that listing.
          </li>
        </ul>
      </Section>

      <Section title="2. Information collected automatically">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Your device&apos;s location, only while you have a bus tracking screen open, so we can show your
            position on the map relative to the bus. We don&apos;t track your location in the background or
            when you&apos;re not using that screen.
          </li>
          <li>Motion data, used only to improve the accuracy of your location while tracking a bus.</li>
          <li>
            A push notification token, so we can send you booking, boarding, and trip updates. You can turn
            these off from your device settings at any time.
          </li>
          <li>Booking, payment, wallet, and trip rating history tied to your account.</li>
        </ul>
      </Section>

      <Section title="3. Payments">
        <p>
          Card payments are handled entirely by our payment gateway partner (Mastercard Payment Gateway
          Services, via our banking partner) on their own secure payment page. BusConnect never receives or
          stores your full card number, expiry date, or CVV. We keep a record of the payment amount, status,
          and a gateway reference number for receipts and support.
        </p>
      </Section>

      <Section title="4. Who we share information with">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>The bus operator for a trip you&apos;ve booked, so they can verify your ticket at boarding.</li>
          <li>Our payment gateway partner, to process a payment or refund you&apos;ve requested.</li>
          <li>
            Other users, only for what you choose to make public: a Hire a Bus listing you post, or the star
            rating and comment you leave for an operator.
          </li>
        </ul>
        <p>We don&apos;t sell your information to advertisers or other third parties.</p>
      </Section>

      <Section title="5. How long we keep it">
        <p>
          We keep your account and booking history for as long as your account is active, so you have a
          record of past trips and can be identified for support requests. You can request deletion of your
          account and personal data at any time from the app, or by contacting us.
        </p>
      </Section>

      <Section title="6. Your choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Update your name, phone, and email from your profile at any time.</li>
          <li>Turn off push notifications from your device settings.</li>
          <li>Delete your account from the app, or by contacting us.</li>
        </ul>
      </Section>

      <Section title="7. Children">
        <p>BusConnect isn&apos;t directed at children, and we don&apos;t knowingly collect information from them.</p>
      </Section>

      <Section title="8. Security">
        <p>
          Connections between the app, our servers, and our payment gateway are encrypted. Access to
          personal data within BusConnect is limited to what&apos;s needed to operate the service.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this policy from time to time. Continuing to use BusConnect after a change means
          you accept the updated policy. See our{" "}
          <Link href={lp("/terms")} className="text-brand underline dark:text-blue-400">
            Terms of Service
          </Link>{" "}
          for the rules that govern using BusConnect itself.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions about this policy or your data? Reach us at{" "}
          <a href="mailto:hello@busconnect.lk" className="text-brand underline dark:text-blue-400">
            hello@busconnect.lk
          </a>{" "}
          or +94 76 467 0645.
        </p>
      </Section>
    </div>
  );
}
