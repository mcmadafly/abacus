import type { APIRoute } from "astro";
import { LEGAL_MD } from "../lib/articles";
import { SITE_URL } from "../lib/site";

export const GET: APIRoute = () => {
  const md = `# Privacy Policy

_${SITE_URL}/privacy_

${LEGAL_MD.privacy.trim()}
`;
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
