import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheMediaBox — Personalized Keepsakes for the Moments That Matter",
  description:
    "Video guest books, custom photo props, voice magnets, and heirloom keepsakes for weddings, graduations, birthdays, quinceañeras, baby showers, retirements, family reunions, and Kwanzaa.",
  keywords: [
    "video guest book",
    "custom photo props",
    "voice magnet",
    "wedding keepsakes",
    "graduation gifts",
    "quinceanera gifts",
    "Black wedding",
    "African American gifts",
    "heirloom keepsakes",
  ],
  openGraph: {
    title: "TheMediaBox — Personalized Keepsakes for the Moments That Matter",
    description:
      "Video guest books, custom photo props, voice magnets, and heirloom keepsakes for Black celebrations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full flex flex-col pattern-overlay">
        <SiteHeader />
        <div className="flex-1 flex flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

import Link from "next/link";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-bg-glass-strong border-b border-border-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center text-white font-display font-bold text-lg shadow-md">
            ✦
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-tight text-text-primary">
              TheMediaBox
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-text-muted font-semibold -mt-0.5">
              Keepsakes · Heritage · Love
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/products" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-gold-deep transition">
            Shop
          </Link>
          <Link href="/services" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-gold-deep transition">
            AI Services
          </Link>
          <Link href="/collections/weddings" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-gold-deep transition">
            Collections
          </Link>
          <Link href="/about" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-gold-deep transition">
            About
          </Link>
          <Link href="/faq" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-gold-deep transition">
            FAQ
          </Link>
        </nav>

        <Link href="/products" className="btn-primary text-sm py-2 px-5">
          Shop Now
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border-glass bg-bg-glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-gold-deep flex items-center justify-center text-white font-display font-bold text-lg">
                ✦
              </div>
              <div className="font-display font-bold text-lg text-text-primary">
                TheMediaBox
              </div>
            </div>
            <p className="text-text-tertiary text-sm leading-relaxed">
              Personalized keepsakes for the moments that matter. Built for Black
              celebrations, made to last forever.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-text-primary mb-3">
              Shop
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-text-tertiary hover:text-gold-deep">All Products</Link></li>
              <li><Link href="/collections/weddings" className="text-text-tertiary hover:text-gold-deep">Weddings</Link></li>
              <li><Link href="/collections/graduations" className="text-text-tertiary hover:text-gold-deep">Graduations</Link></li>
              <li><Link href="/collections/birthdays" className="text-text-tertiary hover:text-gold-deep">Birthdays</Link></li>
              <li><Link href="/collections/quinceaneras" className="text-text-tertiary hover:text-gold-deep">Quinceañeras</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-text-primary mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-text-tertiary hover:text-gold-deep">About</Link></li>
              <li><Link href="/faq" className="text-text-tertiary hover:text-gold-deep">FAQ</Link></li>
              <li><a href="mailto:hello@themediabox.store" className="text-text-tertiary hover:text-gold-deep">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-text-primary mb-3">
              Connect
            </h4>
            <p className="text-text-tertiary text-sm leading-relaxed mb-3">
              For custom orders, bulk pricing, or press inquiries:
            </p>
            <a
              href="mailto:hello@themediabox.store"
              className="text-gold-deep text-sm font-semibold hover:underline"
            >
              hello@themediabox.store
            </a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border-glass flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} TheMediaBox · Made with care, shipped with love.</p>
          <p>Handcrafted in Atlanta, GA</p>
        </div>
      </div>
    </footer>
  );
}
