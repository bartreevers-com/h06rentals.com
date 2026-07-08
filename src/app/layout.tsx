import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StickyMobileCTA } from "@/components/StickyMobileCTA";
import { ShowroomEntry } from "@/components/ShowroomEntry";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.h06rentals.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "H06 Rentals — Luxury Car Hire & Chauffeur Service in Lagos",
    template: "%s — H06 Rentals",
  },
  description:
    "Premium chauffeur-driven car hire in Lagos. Airport transfers, corporate and interstate travel. Prado, Lexus GX460, Land Cruiser and exotic fleet. Available 24/7.",
  keywords: [
    "luxury car hire Lagos",
    "chauffeur service Lagos",
    "airport transfer Lagos",
    "corporate car rental Nigeria",
    "interstate car hire",
    "H06 Rentals",
  ],
  openGraph: {
    type: "website",
    siteName: "H06 Rentals",
    title: "H06 Rentals — Luxury Car Hire & Chauffeur Service in Lagos",
    description:
      "A private showroom for Lagos luxury mobility. Explore the fleet, build your trip, pay securely, and let the concierge handle the rest.",
    images: ["/images/hero-lagos-bridge.webp"],
  },
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b100d",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AutoRental",
  "@id": `${SITE_URL}/`,
  name: "H06 Rentals",
  description:
    "Premium luxury car hire and chauffeur services in Lagos, Nigeria. Airport transfers, corporate trips, VIP events, and interstate travel.",
  url: `${SITE_URL}/`,
  telephone: "+2349139999533",
  email: "hello@h06rentals.com",
  priceRange: "₦₦₦",
  currenciesAccepted: "NGN",
  paymentAccepted: "Card, Bank Transfer, USSD",
  openingHours: "Mo-Su 00:00-24:00",
  address: {
    "@type": "PostalAddress",
    streetAddress: "1, Gbangbala Street, Ikate",
    addressLocality: "Lekki",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  geo: { "@type": "GeoCoordinates", latitude: 6.4281, longitude: 3.4219 },
  sameAs: ["https://www.instagram.com/h06rentals"],
  areaServed: [
    { "@type": "City", name: "Lagos" },
    { "@type": "City", name: "Abuja" },
    { "@type": "City", name: "Port Harcourt" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
        <ShowroomEntry />
        <Navbar />
        <main className="pb-20 lg:pb-0">{children}</main>
        <Footer />
        <StickyMobileCTA />
      </body>
    </html>
  );
}
