// The whole surface the app's page gets from the desktop shell. It runs sandboxed with context
// isolation, so the page can call these functions but can't reach Node or Electron itself; main.js
// validates every call. The app's side of this contract is apps/mobile/src/lib/desktop.ts — keep
// the two in step.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("legalfinderDesktop", {
  platform: process.platform,
  appVersion: () => ipcRenderer.invoke("lf:app-version"),

  // { url, method, headers: [name, value][], body: Uint8Array | null }
  //   → { status, statusText, headers: [name, value][], body: Uint8Array }
  fetch: (request) => ipcRenderer.invoke("lf:fetch", request),

  store: {
    get: (key) => ipcRenderer.invoke("lf:store:get", key),
    set: (key, value) => ipcRenderer.invoke("lf:store:set", key, value),
    remove: (key) => ipcRenderer.invoke("lf:store:delete", key),
  },

  authSession: {
    // { url, returnUrl, resolveOnFocus? } → { type: "success", url } | { type: "cancel" }
    start: (options) => ipcRenderer.invoke("lf:auth-session:start", options),
    cancel: () => ipcRenderer.invoke("lf:auth-session:cancel"),
  },

  // legalfinder:// links that aren't the answer to an authSession. Returns an unsubscribe function.
  onDeepLink: (listener) => {
    const handler = (_event, url) => listener(url);
    ipcRenderer.on("lf:deep-link", handler);
    return () => ipcRenderer.removeListener("lf:deep-link", handler);
  },
  launchDeepLink: () => ipcRenderer.invoke("lf:launch-deep-link"),
});
