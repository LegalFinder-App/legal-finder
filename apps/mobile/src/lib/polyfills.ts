// Node builtins some deps (e.g. @clerk/expo-passkeys) expect. Must load before those imports.
import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
