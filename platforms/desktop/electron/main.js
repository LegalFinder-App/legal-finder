// Thin desktop shell: opens one window pointed at the real deployed LegalFinder site. There is
// no local server and no bundled client here on purpose (see platforms/README.md) — Clerk's
// session cookies and Supabase's realtime websocket both behave like a normal browser tab this
// way, because the window's origin IS the production origin, not a custom app:// scheme.
const { app, BrowserWindow, shell, session } = require("electron");
const path = require("node:path");

// A packaged, distributed app has no .env file on the end user's machine, so the URL a real
// build ships with has to be baked in here — process.env.VITE_APP_URL only matters for local
// `npm run desktop:dev` testing against a dev server. If you fork this for a different
// deployment, update PRODUCTION_APP_URL to match.
const PRODUCTION_APP_URL = "https://legalfinder.co";
const APP_URL = process.env.VITE_APP_URL || PRODUCTION_APP_URL;

function isSameOrigin(targetUrl) {
  try {
    return new URL(targetUrl).origin === new URL(APP_URL).origin;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "LegalFinder",
    backgroundColor: "#1a2338",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Anything that isn't the app's own origin — OAuth providers (Google), external links,
  // mailto:, etc. — opens in the system browser instead of a second Electron window. Without
  // this, Google's OAuth consent screen can reject the request as an "disallowed_useragent".
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSameOrigin(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Same idea for in-page navigation attempts (as opposed to window.open): keep the main window
  // on the app's own origin, send everything else out to the OS browser.
  win.webContents.on("will-navigate", (event, url) => {
    if (isSameOrigin(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  // The app itself needs real permissions to work: notifications (push), and camera/microphone
  // for the embedded Jitsi live-courtroom video calls. Jitsi's iframe (meet.jit.si — the only
  // frame-src the app's CSP allows) requests media permission under ITS OWN origin, not the
  // app's, so it needs an explicit entry alongside the app's own origin.
  const mediaOrigins = [new URL(APP_URL).origin, "https://meet.jit.si"];
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const requestingOrigin = details?.requestingUrl
        ? new URL(details.requestingUrl).origin
        : null;
      if (permission === "notifications")
        return callback(requestingOrigin === new URL(APP_URL).origin);
      if (permission === "media")
        return callback(!!requestingOrigin && mediaOrigins.includes(requestingOrigin));
      callback(false);
    },
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
