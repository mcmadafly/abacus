// Stand-in for `@clerk/astro/server` in the no-auth ("waitlist") build, aliased
// via astro.config when the Clerk integration is omitted. `clerkMiddleware` is
// never invoked (auth routes redirect to /beta first); `createRouteMatcher` is
// reimplemented so the middleware's route checks still work.

export function createRouteMatcher(patterns: string[]) {
  const res = patterns.map((p) => new RegExp(`^${p}$`));
  return (req: Request) => {
    const path = new URL(req.url).pathname;
    return res.some((re) => re.test(path));
  };
}

export function clerkMiddleware(_handler?: unknown) {
  return (_context: unknown, next: () => unknown) => next();
}
