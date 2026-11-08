import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";

import appCss from "../styles.css?url";
import jakartaLatin from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url";
import { Toaster } from "@/components/ui/sonner";
import { LiquidGlassFilter, enableLiquidGlassRefraction } from "@/components/ui/liquid-button";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider, THEME_INIT_SCRIPT, useTheme } from "@/lib/theme";
import { useHideNativeSplashScreen, useNativeBackButton, useNativeStatusBar } from "@/lib/native";

function NotFoundComponent() {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-sky px-4">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
      <div className="max-w-md text-center">
        <p className="eyebrow text-brass">Error 404</p>
        <h1 className="mt-3 text-h1 font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="press inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sky px-4">
      <div className="max-w-md text-center">
        <h1 className="text-h3 font-bold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="press inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="press inline-flex h-11 items-center justify-center rounded-full border border-input bg-card px-6 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "LegalFinder | Find trusted legal help" },
      {
        name: "description",
        content:
          "LegalFinder connects people with verified advocates, courts, police services and legal knowledge on every device.",
      },
      { name: "author", content: "LegalFinder" },
      { property: "og:title", content: "LegalFinder | Find trusted legal help" },
      {
        property: "og:description",
        content:
          "Verified advocates, case tracking, court judgements and legal guidance in one platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#f9fafc", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0b1020", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // The UI face is self-hosted (styles.css); preloading its Latin file avoids a late swap.
      {
        rel: "preload",
        href: jakartaLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      // The LegalFinder coin emblem (public/images/brand), in the sizes browsers ask for.
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/icons/favicon-16.png", type: "image/png", sizes: "16x16" },
      { rel: "icon", href: "/icons/favicon-96.png", type: "image/png", sizes: "96x96" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Sets .dark before paint so navigating/reloading never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        {/* The production Clerk instance requires MFA, so every new session starts "pending" on a
            setup-mfa task and Clerk treats it as signed out until that's done. Without a task URL
            Clerk has nowhere to send the user, and sign-in silently strands them on /auth. */}
        <ClerkProvider taskUrls={{ "setup-mfa": "/session-tasks/setup-mfa" }}>
          {children}
        </ClerkProvider>
        <LiquidGlassFilter />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    router.invalidate();
    if (isSignedIn) queryClient.invalidateQueries();
  }, [isLoaded, isSignedIn, router, queryClient]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <NativeAppEffects />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** No-op on the web; inside the Capacitor app this keeps native chrome in sync with the UI. */
function NativeAppEffects() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  useNativeStatusBar(resolvedTheme);
  useNativeBackButton(router);
  useHideNativeSplashScreen();
  useEffect(() => enableLiquidGlassRefraction(), []);
  return null;
}
