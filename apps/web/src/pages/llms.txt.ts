/**
 * /llms.txt — a curated, machine-readable index of the site for large language
 * models and AI assistants (see https://llmstxt.org). Kept in sync with the
 * blog registry so new posts appear automatically.
 */
import type { APIRoute } from "astro";
import { POSTS, plainHeading } from "../lib/posts";
import { SITE_URL, GITHUB_URL } from "../lib/site";

export const GET: APIRoute = () => {
  const body = `# Abacus

> Abacus is privacy-first web analytics with a daily email digest — "real analytics, sent to your inbox every day." It is cookie-free, collects no personal data, requires no consent banner, loads a sub-1KB script, and is open source (AGPL-3.0).

Abacus measures the fundamentals — pageviews, unique visitors, top pages, traffic sources, countries, and devices — without cookies and without identifying individuals. Unique visitors are counted with a one-way salted hash that rotates every day, so no one can be tracked across days or across sites. Every morning it emails account holders a clean, readable summary of the previous day. It is free for one site; paid plans start at $9/month. The entire stack runs on Cloudflare's edge and can also be self-hosted.

## Product
- [Home](${SITE_URL}/): Product overview, live demo, features, and pricing.
- [Pricing](${SITE_URL}/pricing): Plans — free for one site, Growth $9/mo, Scale $29/mo.
- [Docs](${SITE_URL}/docs): Install the tracking snippet, custom events, single-page-app support, and excluding traffic.

## Blog
${POSTS.map((p) => `- [${plainHeading(p)}](${SITE_URL}/blog/${p.slug}): ${p.dek}`).join("\n")}

## Policies
- [Privacy Policy](${SITE_URL}/privacy): What Abacus collects and does not, in plain English.
- [Data Policy](${SITE_URL}/data-policy): Technical detail on what is measured, the rotating-hash design, storage, and retention.

## Source
- [Source code on GitHub](${GITHUB_URL}): Open source under AGPL-3.0; self-hostable.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
