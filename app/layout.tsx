import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { GlobalSearch } from "../src/features/navigation/global-search";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Poultry Breeder Portal",
  description: "V1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-black antialiased">
        <header className="border-b border-black/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-sm font-semibold">
              Poultry Breeder Portal
            </Link>
            <div className="flex flex-1 items-center justify-end gap-4">
              <div className="hidden w-full max-w-md md:block">
                <GlobalSearch />
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <Link className="text-black/70 hover:text-black" href="/">
                  Home
                </Link>
                <Link className="text-black/70 hover:text-black" href="/chickens">
                  Chickens
                </Link>
                <Link className="text-black/70 hover:text-black" href="/breeding-events">
                  Breeding
                </Link>
                <Link className="text-black/70 hover:text-black" href="/coops">
                  Coops / Locations
                </Link>
                <Link className="text-black/70 hover:text-black" href="/data">
                  Data
                </Link>
              </nav>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8 md:hidden">
            <GlobalSearch />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}


