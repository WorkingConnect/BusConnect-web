import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Inter,
  Outfit,
  IBM_Plex_Sans,
  Noto_Sans_Sinhala,
  Noto_Sans_Tamil,
} from "next/font/google";
import "./globals.css";
import { ConditionalHeader } from "@/components/conditional-header";
import { ConditionalFooter } from "@/components/conditional-footer";
import { I18nProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm",
  display: "swap",
});
// Sinhala + Tamil glyph coverage (Inter/Outfit/IBM Plex are Latin-only) —
// appended to the font stacks in globals.css so these scripts render properly.
const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sinhala",
  display: "swap",
});
const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tamil",
  display: "swap",
});

const SITE_URL = "https://busconnect.lk";
const SITE_NAME = "BusConnect";
const TAGLINE = "Every Journey, Connected.";
const SITE_DESCRIPTION = `BusConnect – ${TAGLINE} Sri Lanka's Smartest Online Bus Booking Platform. Search Live Seat Availability, Compare Operators and Fares, Book Securely, and Receive Instant QR E tickets.`;
const BRAND_DESCRIPTION =
  "BusConnect is Sri Lanka's Smartest Online Bus Booking Platform, Making Travel Simple With Live Seat Availability, Operator and Fare Comparisons, Secure Online Booking, and Instant QR E tickets.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "BusConnect",
    "bus booking Sri Lanka",
    "online bus tickets Sri Lanka",
    "intercity bus seats",
    "bus seat reservation",
    "bus e ticket Sri Lanka",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `BusConnect | ${TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: `BusConnect | ${TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      slogan: TAGLINE,
      description: BRAND_DESCRIPTION,
      logo: `${SITE_URL}/logo.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-LK",
    },
    {
      "@type": "SiteNavigationElement",
      name: ["Search buses", "Popular routes", "My tickets"],
      url: [`${SITE_URL}/`, `${SITE_URL}/#routes`, `${SITE_URL}/tickets`],
    },
  ],
};

// Set theme class before paint to avoid a flash of the wrong theme. Also
// syncs a cookie on every load so Server Components (e.g. the homepage hero
// video) can read the resolved theme and render the right static assets
// directly, rather than picking one via client-side JS after the fact.
//
// Until the visitor explicitly picks a theme (nav bar toggle, saved to
// localStorage), default to time of day rather than system color-scheme
// preference — light during the day, dark at night — for the hero video
// and the rest of the UI alike.
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  var hour = new Date().getHours();
  var d = t ? t === 'dark' : (hour < 6 || hour >= 18);
  if (d) document.documentElement.classList.add('dark');
  document.cookie = 'theme=' + (d ? 'dark' : 'light') + '; path=/; max-age=31536000; samesite=lax';
} catch (e) {}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The proxy sets x-locale from the URL's locale prefix (passenger routes) or
  // the visitor's cookie/Accept-Language (everywhere else). Language switches
  // are full reloads, so this stays in sync without soft-nav staleness.
  const headerLocaleRaw = (await headers()).get("x-locale") ?? defaultLocale;
  const locale = isLocale(headerLocaleRaw) ? headerLocaleRaw : defaultLocale;
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${ibmPlex.variable} ${notoSinhala.variable} ${notoTamil.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <I18nProvider locale={locale} dict={dict}>
          <ConditionalHeader />
          <main className="flex flex-1 flex-col pb-16 lg:pb-0">{children}</main>
          <ConditionalFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
