/**
 * Auth resolution with a dev bypass.
 *
 * Set `PUBLIC_DISABLE_AUTH=true` in apps/web/.env to work on the dashboard /
 * /app/demo without Clerk: the middleware skips Clerk and pages get a fixed dev
 * user. Set it back to false (or remove it) to restore real authentication.
 */
export const AUTH_DISABLED = import.meta.env.PUBLIC_DISABLE_AUTH === "true";

const DEV_USER = { userId: "dev_user", email: "dev@abacus.local" } as const;

/** Current user, or the dev fallback when auth is disabled. `null` = signed out. */
export async function resolveUser(
  locals: App.Locals,
): Promise<{ userId: string; email: string } | null> {
  if (AUTH_DISABLED) return { ...DEV_USER };

  const { userId } = locals.auth();
  if (!userId) return null;
  const user = await locals.currentUser();
  return {
    userId,
    email: user?.primaryEmailAddress?.emailAddress ?? "unknown@example.com",
  };
}
