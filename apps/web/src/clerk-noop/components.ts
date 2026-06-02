// Stand-in for `@clerk/astro/components` in the no-auth build (aliased via
// astro.config when the Clerk integration is omitted).
export { default as SignIn } from "./Noop.astro";
export { default as SignUp } from "./Noop.astro";
export { default as UserButton } from "./Noop.astro";
export { default as SignedIn } from "./Noop.astro";
export { default as SignedOut } from "./Noop.astro";
export { default as SignInButton } from "./Noop.astro";
export { default as SignUpButton } from "./Noop.astro";
