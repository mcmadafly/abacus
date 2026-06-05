/**
 * /blog/<slug>.md — the raw markdown source of a blog post, linked from the
 * HTML page via <link rel="alternate" type="text/markdown">. Lets crawlers and
 * LLMs grab the clean text without parsing the page chrome.
 */
import type { APIRoute } from "astro";
import { POST_MD } from "../../lib/articles";
import { getPost, plainHeading } from "../../lib/posts";
import { SITE_URL } from "../../lib/site";

export const GET: APIRoute = ({ params }) => {
  const slug = params.slug ?? "";
  const body = POST_MD[slug];
  if (!body) return new Response("Not found", { status: 404 });

  const post = getPost(slug);
  const md = `# ${plainHeading(post)}

> ${post.dek}

_Published ${post.date} · ${post.readingTime} · ${SITE_URL}/blog/${slug}_

${body.trim()}
`;

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
