import type { Metadata } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://huquqai.az"),
  title: "Huquq AI - Hüquqi Köməkçi | Süni Zəka Hüquqşünas",
  description: "Azərbaycan Qanunvericiliyi və Məhkəmə Sistemi üzrə Süni Zəka. Qanunlar, məhkəmə təcrübəsi, rüsum kalkulyatoru və ərizə yazma xidməti.",
  alternates: {
    canonical: "https://huquqai.az",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/icon.png", type: "image/png" }
    ],
    apple: [
      { url: "/apple-icon.png" }
    ]
  },
  openGraph: {
    title: "Huquq AI - Hüquqi Köməkçi",
    description: "Azərbaycan Qanunvericiliyi və Məhkəmə Sistemi üzrə Süni Zəka.",
    url: "https://huquqai.az",
    siteName: "Huquq AI",
    locale: "az_AZ",
    type: "website",
  }
};

import { AuthProvider } from "@/context/AuthContext";
import { CookieAndUpdateBanner } from "@/components/layout/CookieAndUpdateBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="az"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CookieAndUpdateBanner />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
