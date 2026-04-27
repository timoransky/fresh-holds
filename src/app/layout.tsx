import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Agentation } from "agentation";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fresh Holds",
  description:
    "See which Bratislava bouldering gym is freshest since your last visit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable, "font-sans", inter.variable)}>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 font-sans antialiased">
        {children}

        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
