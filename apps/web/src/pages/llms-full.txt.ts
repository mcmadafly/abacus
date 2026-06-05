/**
 * /llms-full.txt — the full text of the main Abacus pages in one file, so an
 * LLM can ingest everything in a single fetch without crawling. Companion to
 * the shorter /llms.txt index. Content is single-sourced from src/articles.
 */
import type { APIRoute } from "astro";
import { POSTS, plainHeading } from "../lib/posts";
import { POST_MD, LEGAL_MD } from "../lib/articles";
import { SITE_URL, GITHUB_URL } from "../lib/site";

export const GET: APIRoute = () => {
  const parts: string[] = [];

  parts.push(`# Abacus — full content for LLMs

> Abacus is privacy-first web analytics with a daily email digest — "real analytics, sent to your inbox every day." It is cookie-free, collects no personal data, requires no consent banner, loads a sub-1KB script, and is open source (AGPL-3.0).

This file contains the full text of the main Abacus pages (blog comparisons and policies). The short index is at ${SITE_URL}/llms.txt. Source code: ${GITHUB_URL}.`);

  for (const post of POSTS) {
    const body = POST_MD[post.slug];
    if (!body) continue;
    parts.push(`---

# ${plainHeading(post)}

URL: ${SITE_URL}/blog/${post.slug}
Published: ${post.date} · ${post.readingTime}

${post.dek}

${body.trim()}`);
  }

  parts.push(`---

# Privacy Policy

URL: ${SITE_URL}/privacy

${LEGAL_MD.privacy.trim()}`);

  parts.push(`---

# Data Policy

URL: ${SITE_URL}/data-policy

${LEGAL_MD["data-policy"].trim()}`);

  return new Response(parts.join("\n\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
