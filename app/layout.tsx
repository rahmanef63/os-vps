import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { RegisterSW } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Topside",
  title: "Topside — VPS cockpit",
  description: "Mobile-first web cockpit for a headless Linux VPS.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Topside", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className="dir-aqua" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased overflow-hidden select-none`}
      >
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
