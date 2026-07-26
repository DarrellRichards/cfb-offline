import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const body = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CFB Offline — Dynasty desk for College Football saves",
  description:
    "CFB Offline turns your EA Sports College Football dynasty save into a local desk for scores, polls, stats, and recruiting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
