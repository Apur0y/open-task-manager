import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TopBar from "@/components/top-bar";
import BottomNav from "@/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Study Tracker",
    template: "%s · Study Tracker",
  },
  description:
    "Track your daily study time for bank-job preparation. Server-side timing, history, and statistics.",
  applicationName: "Study Tracker",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Study Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <TopBar />
        <div className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
