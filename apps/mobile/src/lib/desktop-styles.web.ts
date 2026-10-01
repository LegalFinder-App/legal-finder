// Desktop-only page styles for things react-native-web has no prop for. Imported once, for its
// side effect, by the root layout.
const css = `
  /* Slim scrollbars that sit quietly on either theme instead of the OS default slab. */
  * { scrollbar-width: thin; scrollbar-color: rgba(128, 128, 128, 0.4) transparent; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.4);
    border-radius: 8px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: rgba(128, 128, 128, 0.6); }
  /* Fields show focus with their own brass border; the browser's blue ring on top is noise. */
  input, textarea { outline: none; }
`;

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.id = "legalfinder-desktop";
  style.textContent = css;
  document.head.appendChild(style);
}

export {};
