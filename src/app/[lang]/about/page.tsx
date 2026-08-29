import Link from "next/link";
import Image from "next/image";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/navigation";

export const metadata = {
  title: "About",
  description: "Sri Lanka's live-tracked bus booking platform, connecting passengers with operators.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-lg font-bold tracking-tight">{title}</h2>
      <div className="ui mt-2 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : defaultLocale;
  const lp = (path: string) => localizePath(locale, path);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">About BusConnect</h1>

      <p className="ui mt-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        BusConnect is Sri Lanka&apos;s live-tracked bus booking platform. We built it to close a simple gap in
        intercity travel: passengers couldn&apos;t see where their bus actually was, and operators had no
        digital record of their own tickets, seats, or revenue. BusConnect gives both sides a shared, real-time
        view of every trip.
      </p>

      <Section title="Our vision">
        <p>
          A Sri Lanka where every bus trip, in any town, is as easy to find, book, and track as a flight or a
          train: no guessing when the bus will arrive, no cash changing hands, and no operator left invisible
          because they don&apos;t have a digital storefront of their own.
        </p>
      </Section>

      <Section title="Our mission">
        <p>
          To give passengers a live, trustworthy view of every bus they book, and to give operators the tools
          to run their fleet, verify their tickets, and settle their revenue, all from one platform built for
          Sri Lanka&apos;s intercity network.
        </p>
      </Section>

      <Section title="What we do">
        <p>
          Passengers search routes, compare operators and fares, and book a seat with an instant QR e-ticket,
          then track their bus live on a map from departure to arrival. A reloadable wallet makes repeat
          bookings faster, and Hire a Bus connects passengers who need a private trip with operators who have a
          bus free for it.
        </p>
        <p>
          Operators run their fleet from a dashboard built for the back office: registering buses and pilots,
          scheduling routes and journeys, verifying tickets by QR scan at boarding, and settling revenue per
          trip with a locked-in commission rate and a settlement slip for their records.
        </p>
      </Section>

      <Section title="Why it matters">
        <p>
          Cash-only ticketing and word-of-mouth schedules make it hard for passengers to trust a departure time
          and hard for operators to prove what a trip actually earned. Live tracking, digital tickets, and an
          automatic revenue record fix both problems with the same platform: a passenger&apos;s booking and an
          operator&apos;s settlement are two views of the same trip.
        </p>
      </Section>

      <Section title="Who we are">
        <p>
          BusConnect is powered by MyScope (PVT) Ltd, based in Colombo, Sri Lanka. We&apos;re building for Sri
          Lanka&apos;s intercity bus network first: the operators who run it and the passengers who rely on it
          every day.
        </p>
      </Section>

      <Section title="Founder">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border">
            <Image src="/founder-akila-jayakody.jpg" alt="Akila Jayakody" fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-foreground">Akila Jayakody</p>
            <p className="ui text-sm text-slate-500 dark:text-zinc-500">
              Founder, BusConnect
              <br />
              Director, MyScope (PVT) Ltd
            </p>
          </div>
        </div>
        <p className="mt-4">
          Akila founded BusConnect to bring Sri Lanka&apos;s intercity bus network online, live tracking,
          digital tickets, and fleet management built around how operators and passengers actually travel.
        </p>
      </Section>

      <Section title="Get in touch">
        <p>
          Questions, feedback, or interested in bringing your fleet onto BusConnect? Visit our{" "}
          <Link href={lp("/help")} className="text-brand underline dark:text-blue-400">
            Help Centre
          </Link>{" "}
          or reach us directly at{" "}
          <a href="mailto:hello@busconnect.lk" className="text-brand underline dark:text-blue-400">
            hello@busconnect.lk
          </a>{" "}
          or +94 76 467 0645.
        </p>
      </Section>
    </div>
  );
}
