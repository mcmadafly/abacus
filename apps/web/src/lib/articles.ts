/**
 * Raw markdown source for the long-form pages, single-sourced from
 * `src/articles/*.md`. The same files are rendered to HTML in the matching
 * `.astro` pages (via their `Content` component import); here we expose the raw
 * text so the `.md` endpoints and `/llms-full.txt` stay perfectly in sync.
 */
import vsGoogleAnalytics from "../articles/abacus-vs-google-analytics.md?raw";
import vsPlausible from "../articles/abacus-vs-plausible.md?raw";
import vsBuildItYourself from "../articles/abacus-vs-build-it-yourself.md?raw";
import privacy from "../articles/privacy.md?raw";
import dataPolicy from "../articles/data-policy.md?raw";

/** Blog post bodies, keyed by slug (matches lib/posts.ts). */
export const POST_MD: Record<string, string> = {
  "abacus-vs-google-analytics": vsGoogleAnalytics,
  "abacus-vs-plausible": vsPlausible,
  "abacus-vs-build-it-yourself": vsBuildItYourself,
};

/** Legal/policy page bodies, keyed by path slug. */
export const LEGAL_MD: Record<string, string> = {
  privacy,
  "data-policy": dataPolicy,
};
