import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";

import "@/lib/server-fn-manifest";
import { renderErrorPage } from "./lib/error-page";

// Server function RPCs must let their errors propagate untouched — TanStack Start's own
// serverFn serialization turns a thrown Error into a rejected promise the client can read
// (e.g. the assistant's "Assistant error: ..." message shown via toast). Swapping that for
// this HTML fallback previously replaced every serverFn error — auth failures, misconfigured
// API keys, rate limits — with an opaque "This page didn't load" page.
const errorMiddleware = createMiddleware().server(async ({ next, handlerType }) => {
  try {
    return await next();
  } catch (error) {
    if (handlerType === "serverFn") {
      throw error;
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware(), errorMiddleware, csrfMiddleware],
}));
