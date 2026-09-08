// Intentionally empty: this is a thin shell, not a native-integrated app, so there's no
// window.electronAPI surface to expose yet. Kept as a real file (rather than omitting
// webPreferences.preload entirely) so contextIsolation/sandbox have an explicit, auditable
// preload context to run in, and so a future native feature (e.g. a system tray icon, native
// file picker) has an obvious place to add a contextBridge.exposeInMainWorld call.
