import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oryx — Operator Console",
  description: "Internal SOC / operator console for the Oryx Discord security platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <div className="border-b border-white/10 bg-black/30">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-200/80">Oryx / Internal</p>
              <p className="text-sm text-slate-300">Operator console</p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded-md px-3 py-1 text-slate-200 ring-1 ring-white/10 hover:bg-white/5" href="/fleet">
                Fleet
              </Link>
              <Link className="rounded-md px-3 py-1 text-slate-200 ring-1 ring-white/10 hover:bg-white/5" href="/keys">
                Keys
              </Link>
            </nav>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
