const requiredBrowserVariables = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_CLERK_PUBLISHABLE_KEY",
];
const requiredServerVariables = ["CLERK_SECRET_KEY"];
const recommendedImageKitVariables = [
  "VITE_IMAGEKIT_URL_ENDPOINT",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
];

// Vite exposes only VITE_* variables to browser code at build time. Failing the
// Vercel build here prevents a deployment that can load but fails at runtime.
if (process.env.VERCEL === "1") {
  const missing = requiredBrowserVariables.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(
      `Vercel production build blocked: set ${missing.join(", ")} for the Production environment.`,
    );
    process.exit(1);
  }

  const missingServer = requiredServerVariables.filter((key) => !process.env[key]?.trim());
  if (missingServer.length > 0) {
    console.error(
      `Vercel production build blocked: set ${missingServer.join(", ")} for the Production environment.`,
    );
    process.exit(1);
  }

  const missingImageKit = recommendedImageKitVariables.filter((key) => !process.env[key]?.trim());
  if (missingImageKit.length > 0) {
    console.warn(
      `ImageKit upload will be unavailable until these Vercel env vars are set: ${missingImageKit.join(", ")}.`,
    );
  }
}
