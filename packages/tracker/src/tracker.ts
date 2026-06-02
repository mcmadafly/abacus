/**
 * Abacus tracking snippet — privacy-first, cookie-free, no dependencies.
 *
 * Usage:
 *   <script defer data-domain="example.com" src="https://abacus.example/abacus.js"></script>
 *
 * Optional attributes:
 *   data-api      override the ingest endpoint (defaults to the snippet's own origin)
 *   data-exclude  comma-separated path globs to skip (e.g. "/admin/*,/preview")
 */
(function () {
  "use strict";

  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const domain = script.getAttribute("data-domain");
  if (!domain) return;

  // Default the API to the origin the script was served from.
  const endpoint =
    script.getAttribute("data-api") ||
    new URL(script.src).origin + "/api/event";

  const exclude = (script.getAttribute("data-exclude") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Don't track localhost / file:// unless explicitly opted in.
  const isLocal =
    /^localhost$|^127\.0\.0\.1$|\.local$/.test(location.hostname) ||
    location.protocol === "file:";
  const allowLocal = script.hasAttribute("data-allow-local");

  // Respect a "no analytics" flag a user can set for themselves.
  function flagged(): boolean {
    try {
      return localStorage.getItem("abacus_ignore") === "true";
    } catch {
      return false;
    }
  }

  function pathMatches(glob: string, path: string): boolean {
    const re = new RegExp(
      "^" + glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    );
    return re.test(path);
  }

  function send(eventName: string): void {
    if ((isLocal && !allowLocal) || flagged()) return;
    if (exclude.some((g) => pathMatches(g, location.pathname))) return;

    const payload = {
      n: eventName,
      d: domain,
      u: location.href,
      r: document.referrer || null,
      w: window.innerWidth || null,
    };

    const body = JSON.stringify(payload);
    // sendBeacon survives page unloads; fall back to fetch with keepalive.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      fetch(endpoint, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "text/plain" },
      }).catch(() => {});
    }
  }

  let lastPath = "";
  function pageview(): void {
    // Guard against duplicate fires for the same path (SPA double-pushes).
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    send("pageview");
  }

  // Patch the History API so SPA route changes count as pageviews.
  const history = window.history;
  if (history.pushState) {
    const orig = history.pushState;
    history.pushState = function (this: History, ...args) {
      orig.apply(this, args as Parameters<History["pushState"]>);
      pageview();
    };
    window.addEventListener("popstate", pageview);
  }

  // Count a pageview when a back/forward cache restore happens, too.
  window.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) pageview();
  });

  // Expose a manual API for custom/SPA events: window.abacus('signup')
  (window as unknown as { abacus?: (n: string) => void }).abacus = send;

  // Initial load.
  if (document.visibilityState === "prerender") {
    document.addEventListener("visibilitychange", function once() {
      if (document.visibilityState !== "prerender") {
        document.removeEventListener("visibilitychange", once);
        pageview();
      }
    });
  } else {
    pageview();
  }
})();
