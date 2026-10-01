import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    // pdfkit (under @react-pdf/renderer) finds its built-in fonts through its own package.json
    // "imports" map (#standard-fonts/*). Bundled into the server it can no longer resolve them —
    // "Cannot find module '#standard-fonts/Helvetica'" — so it stays a real package, copied whole
    // into the server output. Needed by src/lib/documents/generate.server.ts.
    nitro({ traceDeps: ["pdfkit*"] }),
    react(),
    tailwindcss(),
  ],
  resolve: { tsconfigPaths: true },
});
