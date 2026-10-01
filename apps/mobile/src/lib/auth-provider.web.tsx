import type { ReactNode } from "react";
import { Clerk } from "@clerk/clerk-js/no-rhc";
import { InternalClerkProvider } from "@clerk/react/internal";
import { bridgedFetch } from "./bridged-fetch";
import { env } from "./env";
import * as SecureStore from "./secure-store";

// Clerk in the desktop app. A browser page normally keeps its Clerk session in cookies on the
// site's own domain, which an app:// page can't do. So this runs Clerk the way the phones do —
// "native" mode: the session is a token this app stores (in the OS keychain) and sends in the
// Authorization header — which is what @clerk/expo sets up on iOS/Android. The no-rhc build of
// clerk-js is the self-contained one: it never downloads code at runtime.

const CLIENT_JWT_KEY = "__clerk_client_jwt";

/** "pk_live_<base64 of 'clerk.example.com$'>" → "clerk.example.com" */
function frontendApiHost(publishableKey: string): string {
  return atob(publishableKey.split("_")[2] ?? "").replace(/\$$/, "");
}

// Clerk's API doesn't answer an app:// origin with CORS headers, so its requests go through the
// desktop shell. clerk-js looks `fetch` up at call time; nothing else is rerouted.
const clerkHost = frontendApiHost(env.clerkPublishableKey);
const pageFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let host = "";
  try {
    host = new URL(url, globalThis.location?.href).host;
  } catch {
    // not a URL fetch can use either — let it report the error
  }
  return host === clerkHost ? bridgedFetch(input, init) : pageFetch(input, init);
};

let instance: Clerk | null = null;

function clerkInstance(): Clerk {
  if (instance) return instance;
  const clerk = new Clerk(env.clerkPublishableKey);
  clerk.__internal_onBeforeRequest(async (request) => {
    request.credentials = "omit";
    request.url?.searchParams.append("_is_native", "1");
    const jwt = await SecureStore.getItemAsync(CLIENT_JWT_KEY);
    (request.headers as Headers).set("authorization", jwt ?? "");
  });
  clerk.__internal_onAfterResponse(async (_request, response) => {
    const jwt = response?.headers.get("authorization");
    if (jwt) await SecureStore.setItemAsync(CLIENT_JWT_KEY, jwt);
  });
  instance = clerk;
  // Development builds only: lets the desktop end-to-end tests drive Clerk directly.
  if (__DEV__) (globalThis as { __lfClerk?: Clerk }).__lfClerk = clerk;
  return clerk;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <InternalClerkProvider
      publishableKey={env.clerkPublishableKey}
      Clerk={clerkInstance()}
      standardBrowser={false}
      experimental={{ runtimeEnvironment: "headless" }}
    >
      {children}
    </InternalClerkProvider>
  );
}
