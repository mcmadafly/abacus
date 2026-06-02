/**
 * Launch state.
 *
 * In production we run in "waitlist mode" until a Clerk production instance is
 * wired up: the auth routes (/app, /sign-in, /sign-up) funnel to the /beta
 * early-adopter list, and the primary CTAs point there. Flip it on by setting
 * `PUBLIC_AUTH_ENABLED=true` at build time once real auth is ready.
 *
 * (Local dev is never in waitlist mode, so the dashboard stays workable; see
 * also PUBLIC_DISABLE_AUTH in lib/auth.ts.)
 */
export const AUTH_ENABLED = import.meta.env.PUBLIC_AUTH_ENABLED === "true";
export const WAITLIST = import.meta.env.PROD && !AUTH_ENABLED;

export const START_HREF = WAITLIST ? "/beta" : "/sign-up";
export const SIGNIN_HREF = WAITLIST ? "/beta" : "/sign-in";
