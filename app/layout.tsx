import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Cairo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { I18nProvider } from "@/lib/i18n/context"
import './globals.css'
import 'leaflet/dist/leaflet.css';

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#059669',
}

export const metadata: Metadata = {
  applicationName: 'Greenduty',
  title: 'GreenDuty - Empowering Nature, Knowledge, and Commerce',
  description: 'GreenDuty is an Algerian eco-system connecting pollution tracking, agricultural marketplace, and eco-logistics for a sustainable future.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Greenduty',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="green" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geist.variable} ${cairo.variable} ${geist.className} font-sans antialiased`}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
          <ThemeToggle />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
