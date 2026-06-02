import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { AUTH_DISABLED } from "./lib/auth";

// Routes that actually need Clerk: the gated dashboard and the auth screens.
// Everything else (marketing, /api/event ingest, /abacus.js) skips Clerk
// entirely — so public pages never trigger a dev-browser handshake redirect.
const needsClerk = createRouteMatcher([
  "/app(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);
const isProtected = createRouteMatcher(["/app(.*)"]);

const withClerk = clerkMiddleware((auth, context) => {
  if (isProtected(context.request)) {
    const { userId, redirectToSignIn } = auth();
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: context.request.url });
    }
  }
});

export const onRequest = (
  context: Parameters<typeof withClerk>[0],
  next: Parameters<typeof withClerk>[1],
) => {
  // Dev bypass: skip Clerk entirely (pages fall back to a dev user).
  if (AUTH_DISABLED) return next();
  if (needsClerk(context.request)) {
    return withClerk(context, next);
  }
  return next();
};
