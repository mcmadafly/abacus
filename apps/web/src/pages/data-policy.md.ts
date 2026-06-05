import type { APIRoute } from "astro";
import { LEGAL_MD } from "../lib/articles";
import { SITE_URL } from "../lib/site";

export const GET: APIRoute = () => {
  const md = `# Data Policy

_${SITE_URL}/data-policy_

${LEGAL_MD["data-policy"].trim()}
`;
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
