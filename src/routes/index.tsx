import { createFileRoute, redirect } from "@tanstack/react-router";

// The secure sign-in screen is the application's entry point.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "JalDrishti AI — Secure Sign-in" },
      { name: "description", content: "Sign in to JalDrishti AI, the watershed geospatial intelligence platform." },
      { property: "og:title", content: "JalDrishti AI" },
      { property: "og:description", content: "Geospatial Intelligence for Smarter Watershed Development." },
    ],
  }),
});
