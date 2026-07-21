import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import { Agentation } from "agentation";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AuthListener } from "@/components/AuthListener";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
});

const siteUrl = "https://freshholds.janci.dev";
const siteName = "Fresh Holds";
const siteTitle = "Fresh Holds - where's the fresh climbing in Bratislava?";
const siteDescription =
  "Log your visits to get the best recommendation for your next climbing session in Bratislava, based on the recent gym resets. Sorted by what’s new since you were last there.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · Fresh Holds",
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "bouldering",
    "climbing",
    "Bratislava",
    "climbing gym",
    "fresh holds",
    "gym resets",
    "The Spot",
    "K2",
    "Hangár",
  ],
  authors: [{ name: "janci.dev", url: "https://janci.dev" }],
  creator: "janci.dev",
  publisher: "janci.dev",
  alternates: {
    canonical: "/",
    types: {
      "text/markdown": "/index.md",
    },
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "sports",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf6",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={cn(geistSans.variable, geistMono.variable, baloo.variable, "font-sans")}
    >
      <body className="min-h-dvh bg-background text-foreground font-sans antialiased">
        {children}
        {modal}

        <AuthListener userId={user?.id ?? null} />
        <Analytics />
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
