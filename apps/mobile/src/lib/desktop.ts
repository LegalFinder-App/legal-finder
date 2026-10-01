// The desktop shell's bridge — the app's side of platforms/desktop/electron/preload.js (keep the
// two in step). It only exists inside the Windows/macOS/Linux app: on phones, and in a plain
// browser tab during development, `desktop` is undefined and every caller needs a fallback.

export type BrowserSessionResult = { type: "success"; url: string } | { type: "cancel" };

export interface DesktopBridge {
  platform: string;
  /** A development shell running the end-to-end tests — never true in an installed app. */
  testMode: boolean;
  appVersion(): Promise<string>;
  fetch(request: {
    url: string;
    method: string;
    headers: [string, string][];
    body: Uint8Array | null;
  }): Promise<{
    status: number;
    statusText: string;
    headers: [string, string][];
    body: Uint8Array;
  }>;
  store: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
  authSession: {
    start(options: {
      url: string;
      returnUrl: string;
      resolveOnFocus?: boolean;
    }): Promise<BrowserSessionResult>;
    cancel(): Promise<void>;
  };
  onDeepLink(listener: (url: string) => void): () => void;
  launchDeepLink(): Promise<string | null>;
}

export const desktop: DesktopBridge | undefined = (
  globalThis as { legalfinderDesktop?: DesktopBridge }
).legalfinderDesktop;
