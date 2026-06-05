/**
 * Blog post metadata. The post bodies live in `pages/blog/<slug>.astro`; this
 * registry powers the /blog index and each post's header. Newest first.
 */
export interface Post {
  slug: string;
  title: string;
  /** Heading shown on the post + index (may contain <em>). */
  heading: string;
  dek: string;
  /** Human display date, e.g. "June 2026". */
  date: string;
  /** ISO publish date (YYYY-MM-DD) for sitemaps + structured data. */
  iso: string;
  readingTime: string;
}

/** Plain-text heading (strips the <em> accent markup). */
export function plainHeading(post: Post): string {
  return post.heading.replace(/<[^>]+>/g, "");
}

export const POSTS: Post[] = [
  {
    slug: "abacus-vs-google-analytics",
    title: "Abacus vs. Google Analytics — Abacus",
    heading: "Abacus vs. <em>Google Analytics</em>",
    dek: "GA4 is free, powerful, and built to feed an ad business. Here's what you trade for that, and when a lighter, privacy-first tool serves you better.",
    date: "June 2026",
    iso: "2026-06-04",
    readingTime: "6 min read",
  },
  {
    slug: "abacus-vs-plausible",
    title: "Abacus vs. Plausible — Abacus",
    heading: "Abacus vs. <em>Plausible</em>",
    dek: "We love Plausible — it helped make privacy-first analytics mainstream. Here's where Abacus is similar, where it differs, and how to choose.",
    date: "June 2026",
    iso: "2026-06-04",
    readingTime: "5 min read",
  },
  {
    slug: "abacus-vs-build-it-yourself",
    title: "Abacus vs. building it yourself — Abacus",
    heading: "Abacus vs. <em>building it yourself</em>",
    dek: "A logs table and a SQL query feels free. Here's the real cost of a homegrown analytics pipeline — and when rolling your own actually makes sense.",
    date: "June 2026",
    iso: "2026-06-04",
    readingTime: "7 min read",
  },
];

export function getPost(slug: string): Post {
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`Unknown post: ${slug}`);
  return post;
}
