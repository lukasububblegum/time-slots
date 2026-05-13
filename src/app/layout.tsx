import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Time Slots",
  description: "Local-first personal task scheduler",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Time Slots",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f7f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
