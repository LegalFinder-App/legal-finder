# LegalFinder Platform Matrix

This directory separates the product into platform-specific delivery targets while keeping the web app as the shared source of truth.

## Structure

- `web/` - browser and installable PWA delivery.
- `mobile/` - iOS and Android packaging and native device capabilities.
- `desktop/` - macOS, Windows and Linux packaging.
- `shared/` - release notes, feature contracts and platform rules that must stay aligned across targets.

## Operating model

The `src/` directory remains the shared application core for UI, routing, business workflows and Supabase integration.
Each platform folder contains release-specific configuration, native shell notes and deployment instructions so the repository can be built into store-ready packages by a future native wrapper or release pipeline.
