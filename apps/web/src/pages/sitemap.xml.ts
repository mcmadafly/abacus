/**
 * XML sitemap for search engines + AI crawlers. Lists every public,
 * indexable page. Gated/auth/api/ingest routes are intentionally omitted.
 */
import type { APIRoute } from "astro";
import { POSTS } from "../lib/posts";
import { SITE_URL } from "../lib/site";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const entries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/docs", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/upgrade", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", lastmod: today, changefreq: "yearly", priority: "0.4" },
  { path: "/data-policy", lastmod: today, changefreq: "yearly", priority: "0.4" },
  ...POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    lastmod: p.iso,
    changefreq: "yearly",
    priority: "0.6",
  })),
];

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const parts = [`    <loc>${SITE_URL}${e.path}</loc>`];
    if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
    if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
