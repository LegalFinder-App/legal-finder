// LegalFinder desktop app (Windows / macOS / Linux).
//
// The window runs the same app code as Android and iOS — apps/mobile, exported with
// `expo export --platform web` — served from files inside the installer through the app://
// scheme. It never loads the website. The few things a web page can't do for itself go through
// the bridge in preload.js, and every one of them is implemented (and policed) here:
//   - fetch for the two hosts that don't answer an app:// origin (Clerk's API, /api/mobile/*)
//   - an encrypted key/value store for the sign-in session (OS keychain via safeStorage)
//   - "open this in the system browser and tell me when legalfinder:// comes back"
//     (Google/Apple/LinkedIn sign-in, Pesapal checkout)
const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  safeStorage,
  session,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "app";
const APP_HOST = "legalfinder";
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
// Same scheme the phones use, so Clerk's allow-listed legalfinder://sso-callback and the server's
// legalfinder://payment-result return page work unchanged.
const DEEP_LINK_PREFIX = "legalfinder://";

// The only requests the renderer may make through the fetch bridge. Neither host sends CORS
// headers for app:// (phones don't need them), so a normal fetch from the page would be blocked.
// The overrides exist for testing against a development Clerk instance or a preview deployment.
const BRIDGED_ROUTES = [
  { origin: process.env.LEGALFINDER_CLERK_ORIGIN || "https://clerk.legalfinder.co", prefix: "/" },
  {
    origin: process.env.LEGALFINDER_API_ORIGIN || "https://www.legalfinder.co",
    prefix: "/api/mobile/",
  },
];

const WEB_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, "web")
  : path.resolve(__dirname, "../../../apps/mobile/dist/desktop");

// Development only: serve the app from a running `expo start --web` instead of an export, still
// under app://legalfinder so sign-in, storage and the bridge behave exactly as in a real build.
const DEV_SERVER = app.isPackaged ? null : process.env.LEGALFINDER_DEV_SERVER || null;

// Development only: automated tests drive the app without opening real browser tabs — anything
// that would go to the system browser is recorded instead (read back through globalThis.__lfTest).
const TEST_MODE = !app.isPackaged && process.env.LEGALFINDER_TEST_MODE === "1";
const recordedExternalOpens = [];
const recordedDownloads = [];
if (TEST_MODE) {
  globalThis.__lfTest = {
    externalOpens: recordedExternalOpens,
    downloads: recordedDownloads,
    handleDeepLink,
  };
}

function openInBrowser(url) {
  if (TEST_MODE) {
    recordedExternalOpens.push(url);
    return Promise.resolve();
  }
  return shell.openExternal(url);
}

const AUTH_SESSION_TIMEOUT_MS = 15 * 60_000;
// After the user comes back to the window without a legalfinder:// link, how long to keep waiting
// for one before giving up (the OS delivers the link and the focus in either order).
const FOCUS_GRACE_MS = 2500;

// Images come from ImageKit / Supabase Storage and arbitrary https hosts (news, advocate photos).
// Scripts only ever come from the bundle. Clerk and /api/mobile go through the bridge, so they
// don't appear in connect-src at all.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  // blob:/data: are picked files being read back for upload.
  "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://upload.imagekit.io https://ik.imagekit.io",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Shown if the app's own files can't be loaded (a damaged install) — better than an empty window.
const LOAD_FAILED_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(
  `<!doctype html><meta charset="utf-8"><title>LegalFinder</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b182b;color:#f4f1eb;font-family:system-ui,sans-serif;text-align:center">
<main style="max-width:420px;padding:24px"><h1 style="font-size:22px">LegalFinder couldn't start</h1>
<p style="opacity:.75;line-height:1.5">Some of the app's files are missing or damaged. Reinstalling LegalFinder should fix it.</p></main>`,
)}`;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** A legalfinder:// link that arrived before the window existed (the app was launched by it). */
let launchDeepLink = null;
/**
 * The one browser hand-off in progress, if any (see startAuthSession).
 * @type {null | {
 *   returnUrl: string, resolveOnFocus: boolean, sawBlur: boolean,
 *   resolve: (result: { type: "success", url: string } | { type: "cancel" }) => void,
 *   timeout: NodeJS.Timeout, focusTimer: NodeJS.Timeout | null }}
 */
let authSession = null;

// Tests (and anyone who wants a throwaway profile) can point the app at a different data folder.
// Has to happen before the single-instance lock below, which lives in that folder.
if (process.env.LEGALFINDER_USER_DATA) app.setPath("userData", process.env.LEGALFINDER_USER_DATA);

// Must run before the app is ready. "standard" gives app:// a real origin (history routing,
// localStorage, relative URLs); "secure" makes it a secure context (crypto, clipboard).
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

// ---------------------------------------------------------------------------------------------
// Deep links (legalfinder://…)
// ---------------------------------------------------------------------------------------------

function findDeepLink(argv) {
  return argv.find((arg) => typeof arg === "string" && arg.startsWith(DEEP_LINK_PREFIX)) ?? null;
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function handleDeepLink(url) {
  if (!url || !url.startsWith(DEEP_LINK_PREFIX)) return;
  if (authSession && url.startsWith(authSession.returnUrl)) {
    endAuthSession({ type: "success", url });
  } else if (mainWindow) {
    mainWindow.webContents.send("lf:deep-link", url);
  } else {
    launchDeepLink = url;
  }
  focusMainWindow();
}

// One running copy: a second launch (which is how Windows and Linux deliver a legalfinder:// link)
// hands its arguments to the first and exits.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const url = findDeepLink(argv);
    if (url) handleDeepLink(url);
    else focusMainWindow();
  });
}

// macOS delivers links through this event instead of argv, possibly before "ready".
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// ---------------------------------------------------------------------------------------------
// Serving the app
// ---------------------------------------------------------------------------------------------

function resolveAppFile(requestUrl) {
  const url = new URL(requestUrl);
  if (url.host !== APP_HOST) return null;
  let relative;
  try {
    relative = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  const candidate = path.normalize(path.join(WEB_ROOT, relative));
  // Never serve anything outside the bundle, whatever the path says.
  if (candidate !== WEB_ROOT && !candidate.startsWith(WEB_ROOT + path.sep)) return null;
  try {
    if (fs.statSync(candidate).isFile()) return candidate;
  } catch {
    // not a file — fall through
  }
  // A route like /lawyers/123 has no file: the app's router handles it from index.html. A missing
  // asset (has an extension) is a real 404.
  return path.extname(relative) ? null : path.join(WEB_ROOT, "index.html");
}

async function serveApp(request) {
  if (DEV_SERVER) {
    const { pathname, search } = new URL(request.url);
    try {
      return await net.fetch(new URL(pathname + search, DEV_SERVER).toString());
    } catch {
      return new Response(`Dev server not reachable at ${DEV_SERVER}`, { status: 502 });
    }
  }
  const file = resolveAppFile(request.url);
  if (!file) return new Response("Not found", { status: 404 });
  const response = await net.fetch(pathToFileURL(file).toString());
  const extension = path.extname(file).toLowerCase();
  const headers = new Headers({
    "content-type": MIME_TYPES[extension] ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
    // Hashed bundle files never change; index.html must always be read fresh after an update.
    "cache-control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  if (extension === ".html") headers.set("content-security-policy", CONTENT_SECURITY_POLICY);
  return new Response(response.body, { status: 200, headers });
}

// ---------------------------------------------------------------------------------------------
// Bridge: fetch, secure store, browser sessions
// ---------------------------------------------------------------------------------------------

/** Every bridge call must come from the app's own page — never from anything else in the window. */
function assertFromApp(event) {
  const frameUrl = event.senderFrame?.url ?? "";
  if (!frameUrl.startsWith(`${APP_ORIGIN}/`)) throw new Error("Bridge call from an unknown page");
}

function isBridgedUrl(url) {
  return BRIDGED_ROUTES.some(
    (route) => url.origin === route.origin && url.pathname.startsWith(route.prefix),
  );
}

// Headers the page has no business choosing for a request made on its behalf.
const BLOCKED_REQUEST_HEADERS = new Set(["host", "cookie", "origin", "referer", "content-length"]);

async function bridgedFetch(event, request) {
  assertFromApp(event);
  const url = new URL(String(request?.url));
  if (url.protocol !== "https:" || !isBridgedUrl(url)) throw new Error("Request not allowed");
  const method = String(request.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [name, value] of request.headers ?? []) {
    if (!BLOCKED_REQUEST_HEADERS.has(String(name).toLowerCase())) headers.set(name, value);
  }
  const hasBody = request.body != null && method !== "GET" && method !== "HEAD";
  const response = await net.fetch(url.toString(), {
    method,
    headers,
    body: hasBody ? Buffer.from(request.body) : undefined,
    // No cookie jar: the session travels in the Authorization header, exactly as on the phones.
    credentials: "omit",
    cache: "no-store",
  });
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: new Uint8Array(await response.arrayBuffer()),
  };
}

const STORE_KEY = /^[\w.-]{1,128}$/;

function storeFile() {
  return path.join(app.getPath("userData"), "secure-store.json");
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storeFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeStore(data) {
  const file = storeFile();
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function storeGet(event, key) {
  assertFromApp(event);
  if (!STORE_KEY.test(String(key))) throw new Error("Invalid key");
  const encrypted = readStore()[key];
  if (typeof encrypted !== "string") return null;
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
  } catch {
    // Written by another OS user/keychain, or corrupted — treat as absent (the user signs in again).
    return null;
  }
}

function storeSet(event, key, value) {
  assertFromApp(event);
  if (!STORE_KEY.test(String(key))) throw new Error("Invalid key");
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure storage is unavailable");
  const data = readStore();
  data[key] = safeStorage.encryptString(String(value)).toString("base64");
  writeStore(data);
}

function storeDelete(event, key) {
  assertFromApp(event);
  if (!STORE_KEY.test(String(key))) throw new Error("Invalid key");
  const data = readStore();
  if (key in data) {
    delete data[key];
    writeStore(data);
  }
}

function endAuthSession(result) {
  if (!authSession) return;
  const current = authSession;
  authSession = null;
  clearTimeout(current.timeout);
  if (current.focusTimer) clearTimeout(current.focusTimer);
  current.resolve(result);
}

async function startAuthSession(event, options) {
  assertFromApp(event);
  const url = new URL(String(options?.url));
  const returnUrl = String(options?.returnUrl ?? "");
  if (url.protocol !== "https:") throw new Error("Only https pages can be opened");
  if (!returnUrl.startsWith(DEEP_LINK_PREFIX)) throw new Error("Invalid return URL");

  endAuthSession({ type: "cancel" });
  await openInBrowser(url.toString());
  return new Promise((resolve) => {
    authSession = {
      returnUrl,
      resolveOnFocus: Boolean(options?.resolveOnFocus),
      sawBlur: false,
      focusTimer: null,
      resolve,
      timeout: setTimeout(() => endAuthSession({ type: "cancel" }), AUTH_SESSION_TIMEOUT_MS),
    };
  });
}

function registerBridge() {
  ipcMain.handle("lf:fetch", bridgedFetch);
  ipcMain.handle("lf:store:get", storeGet);
  ipcMain.handle("lf:store:set", storeSet);
  ipcMain.handle("lf:store:delete", storeDelete);
  ipcMain.handle("lf:auth-session:start", startAuthSession);
  ipcMain.handle("lf:auth-session:cancel", (event) => {
    assertFromApp(event);
    endAuthSession({ type: "cancel" });
  });
  ipcMain.handle("lf:app-version", (event) => {
    assertFromApp(event);
    return app.getVersion();
  });
  // The page asks for this once it's listening, so a link that launched the app isn't lost.
  ipcMain.handle("lf:launch-deep-link", (event) => {
    assertFromApp(event);
    const url = launchDeepLink;
    launchDeepLink = null;
    return url;
  });
}

// ---------------------------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------------------------

function windowStateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStateFile(), "utf8"));
    if (Number.isFinite(state.width) && Number.isFinite(state.height)) return state;
  } catch {
    // first launch
  }
  return { width: 1280, height: 860 };
}

function saveWindowState(win) {
  try {
    const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
    fs.writeFileSync(windowStateFile(), JSON.stringify(state));
  } catch {
    // Not worth interrupting a quit over.
  }
}

const EXTERNAL_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

function openExternally(target) {
  try {
    const url = new URL(target);
    if (EXTERNAL_PROTOCOLS.has(url.protocol)) void openInBrowser(url.toString());
  } catch {
    // not a URL — ignore
  }
}

function createWindow() {
  const state = loadWindowState();
  const win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 400,
    minHeight: 600,
    title: "LegalFinder",
    show: false,
    // Matches the app's paper / ink backgrounds so there's no white flash before first paint.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#070f1b" : "#fcfaf6",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      devTools: !app.isPackaged || process.env.LEGALFINDER_DEVTOOLS === "1",
      // Lets the page know it is under test (preload.js → testMode). Never set in a packaged app.
      additionalArguments: TEST_MODE ? ["--legalfinder-test-mode"] : [],
    },
  });
  mainWindow = win;
  if (state.maximized) win.maximize();

  win.once("ready-to-show", () => win.show());
  // The window is "LegalFinder", whichever screen is showing.
  win.on("page-title-updated", (event) => event.preventDefault());
  win.on("close", () => saveWindowState(win));
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Coming back to the window without a legalfinder:// link means the browser step was abandoned
  // (payments only — the status is re-read from the database either way). A link normally arrives
  // just before or after the focus, hence the grace period.
  win.on("blur", () => {
    if (authSession) authSession.sawBlur = true;
  });
  win.on("focus", () => {
    const current = authSession;
    if (!current || !current.resolveOnFocus || !current.sawBlur || current.focusTimer) return;
    current.focusTimer = setTimeout(() => {
      if (authSession === current) endAuthSession({ type: "cancel" });
    }, FOCUS_GRACE_MS);
  });

  // The window only ever shows the app. Links to anything else open in the user's browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(`${APP_ORIGIN}/`)) return;
    event.preventDefault();
    openExternally(url);
  });

  // -3 is "aborted" (a navigation replaced by another), not a failure.
  win.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(`${APP_ORIGIN}/`)) {
      void win.loadURL(LOAD_FAILED_PAGE);
    }
  });
  win.loadURL(`${APP_ORIGIN}/`).catch(() => {
    // did-fail-load above shows the error page; the rejection itself needs no handling.
  });
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged ? [] : [{ type: "separator" }, { role: "toggleDevTools" }]),
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "LegalFinder website",
          click: () => void openInBrowser("https://www.legalfinder.co"),
        },
        {
          label: "Privacy policy",
          click: () => void openInBrowser("https://www.legalfinder.co/privacy-policy"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------------------------

app.whenReady().then(() => {
  protocol.handle(APP_SCHEME, serveApp);

  // Nothing in the app needs camera, microphone, location or the rest. Copying to the clipboard
  // and showing notifications are the only things a page here may ask for.
  const ALLOWED_PERMISSIONS = new Set(["clipboard-sanitized-write", "notifications"]);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(
      webContents.getURL().startsWith(`${APP_ORIGIN}/`) && ALLOWED_PERMISSIONS.has(permission),
    );
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return requestingOrigin.startsWith(APP_ORIGIN) && ALLOWED_PERMISSIONS.has(permission);
  });

  // Packaged builds register the scheme (the installers also declare it — electron-builder.yml).
  // In development it would point the whole machine's legalfinder:// links at a dev checkout, so
  // it's opt-in there.
  if (app.isPackaged) app.setAsDefaultProtocolClient("legalfinder");
  else if (process.env.LEGALFINDER_REGISTER_PROTOCOL === "1" && process.argv[1]) {
    app.setAsDefaultProtocolClient("legalfinder", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }

  // Tests can't answer a Save dialog: downloads go straight to the temp folder and are recorded.
  if (TEST_MODE) {
    session.defaultSession.on("will-download", (_event, item) => {
      const target = path.join(app.getPath("temp"), `lf-test-${Date.now()}-${item.getFilename()}`);
      item.setSavePath(target);
      item.once("done", (_e, state) => recordedDownloads.push({ target, state }));
    });
  }

  launchDeepLink = launchDeepLink ?? findDeepLink(process.argv);
  registerBridge();
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// No second windows, no embedded pages, ever — whatever the page asks for.
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
