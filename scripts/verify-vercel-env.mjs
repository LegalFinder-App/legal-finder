const requiredBrowserVariables = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];

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
}
