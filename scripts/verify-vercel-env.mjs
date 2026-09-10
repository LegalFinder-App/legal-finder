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
// These features degrade gracefully rather than breaking the whole site, so a missing key here
// is a warning, not a build-blocking failure — but it was previously not checked at all, so a
// missing key failed silently at runtime (a confusing "nothing happens" moment for a user
// clicking Pay or asking the assistant a question) instead of showing up here at build time.
const recommendedAssistantVariables = ["ANTHROPIC_API_KEY"];
const recommendedPesapalVariables = ["PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET"];
const recommendedFlutterwaveVariables = ["FLUTTERWAVE_SECRET_KEY", "FLUTTERWAVE_WEBHOOK_HASH"];
const recommendedWebPushVariables = ["VITE_WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY"];
// Falls back to https://legalfinder.co if unset (see payments.functions.ts and
// compliance-check.server.ts), but an unset value here silently points Pesapal
// callback/IPN URLs and push VAPID subject at the wrong domain on a preview/staging
// deployment — warn so that's caught at build time instead of at first live payment.
const recommendedAppUrlVariables = ["VITE_APP_URL"];

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

  const missingAssistant = recommendedAssistantVariables.filter((key) => !process.env[key]?.trim());
  if (missingAssistant.length > 0) {
    console.warn(
      `The AI assistant will be unavailable until these Vercel env vars are set: ${missingAssistant.join(", ")}.`,
    );
  }

  const missingPesapal = recommendedPesapalVariables.filter((key) => !process.env[key]?.trim());
  if (missingPesapal.length > 0) {
    console.warn(
      `Payments will be unavailable until these Vercel env vars are set: ${missingPesapal.join(", ")}.`,
    );
  }

  const missingFlutterwave = recommendedFlutterwaveVariables.filter(
    (key) => !process.env[key]?.trim(),
  );
  if (missingFlutterwave.length > 0) {
    console.warn(
      `Automatic lawyer payouts will be unavailable until these Vercel env vars are set: ${missingFlutterwave.join(", ")}.`,
    );
  }

  const missingWebPush = recommendedWebPushVariables.filter((key) => !process.env[key]?.trim());
  if (missingWebPush.length > 0) {
    console.warn(
      `Push notifications will be unavailable until these Vercel env vars are set: ${missingWebPush.join(", ")}.`,
    );
  }

  const missingAppUrl = recommendedAppUrlVariables.filter((key) => !process.env[key]?.trim());
  if (missingAppUrl.length > 0) {
    console.warn(
      `${missingAppUrl.join(", ")} not set — Pesapal callback/IPN URLs and the push VAPID subject will fall back to https://legalfinder.co. Set this explicitly for Preview/staging deployments to avoid pointing payment callbacks at the wrong domain.`,
    );
  }
}
