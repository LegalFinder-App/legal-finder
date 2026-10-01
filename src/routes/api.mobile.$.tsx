import { createFileRoute } from "@tanstack/react-router";

// Any /api/mobile path without a route of its own. The apps are released separately from the
// website, so an app can ask for a route this deployment doesn't have. Without this the framework
// answers a JSON request with a 500 "Only HTML requests are supported here", which the app then
// shows to the user; answer in the { error } shape its client expects instead.
const notFound = () =>
  Response.json(
    { error: "This isn't available on the LegalFinder server yet. Please try again later." },
    { status: 404 },
  );

export const Route = createFileRoute("/api/mobile/$")({
  server: { handlers: { GET: notFound, POST: notFound } },
});
