import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Oryx — Server Console",
  description: "Enterprise Discord security control surface for server owners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(34,211,238,0.08),transparent_55%)]" />
        {children}
      </body>
    </html>
  );
}
