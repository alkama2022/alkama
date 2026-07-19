import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ShoppingCart, Menu, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportClientError } from "../lib/error-reporting";
import { getStoredCartId } from "../lib/cart";
import { Toaster } from "@/components/ui/sonner";
import { useCart } from "@/hooks/queries";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-display text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This road leads nowhere. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-display uppercase tracking-wide">
          Something skidded off track
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Khal Tyres Company Limited — Performance Tyres & Wheels" },
      {
        name: "description",
        content:
          "Shop premium performance tyres. Browse by brand, size and category. Fast local delivery and expert fitment.",
      },
      { property: "og:title", content: "Khal Tyres Company Limited — Performance Tyres & Wheels" },
      {
        property: "og:description",
        content: "Premium performance tyres. Browse by brand, size and category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { data: cart } = useCart(getStoredCartId());
  const count = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const [open, setOpen] = useState(false);

  const navLink =
    "text-sm font-semibold uppercase tracking-wider text-foreground/80 hover:text-primary transition";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-full border-2 border-primary bg-background" />
          <span className="font-display text-2xl tracking-wide">
            KHAL<span className="text-primary"> </span>TYRES
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className={navLink} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/products" className={navLink}>
            Shop
          </Link>
          <Link to="/about" className={navLink}>
            About
          </Link>
          <Link to="/contact" className={navLink}>
            Contact
          </Link>

        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            preload={false}
            className="relative inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-bold text-primary">
                {count}
              </span>
            )}
          </Link>
          <button
            aria-label="Toggle menu"
            className="md:hidden rounded-md border border-border p-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
            <Link to="/" className={navLink} onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link to="/products" className={navLink} onClick={() => setOpen(false)}>
              Shop
            </Link>
            <Link to="/about" className={navLink} onClick={() => setOpen(false)}>
              About
            </Link>
            <Link to="/contact" className={navLink} onClick={() => setOpen(false)}>
              Contact
            </Link>

          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="font-display text-2xl">
            KHAL<span className="text-primary"> </span>TYRES
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Performance rubber for daily drivers, weekend warriors and everything in between.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Company
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-primary">
                About us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Shop
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/products" className="hover:text-primary">
                All tyres
              </Link>
            </li>
            <li>
              <Link to="/cart" preload={false} className="hover:text-primary">
                Cart
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Support
          </div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/contact" className="hover:text-primary">
                WhatsApp fitment advice
              </Link>
            </li>
            <li>Same-day dispatch on in-stock items</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Khal Tyres Company Limited. All rights reserved.
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
