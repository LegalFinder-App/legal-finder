// One import for small secrets and preferences everywhere. On phones this is expo-secure-store
// (Keychain / Keystore); the desktop build swaps in secure-store.web.ts.
export { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
