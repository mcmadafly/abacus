/**
 * Shared Clerk `appearance` for SignIn / SignUp / UserButton.
 *
 * Colors are mapped to our themed CSS variables (var(--paper), var(--ink)…),
 * which are redefined under `:root[data-theme="dark"]`. Because Clerk applies
 * these as CSS custom properties, the widgets re-resolve them whenever the
 * theme toggles — so they follow light/dark instantly, with no re-mount.
 *
 * `colorPrimary` is a concrete hex (Clerk derives hover/active shades from it),
 * and indigo reads well on both themes.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#5b46e5",
    colorText: "var(--ink)",
    colorTextSecondary: "var(--ink-soft)",
    colorBackground: "var(--paper)",
    colorInputBackground: "var(--bg-2)",
    colorInputText: "var(--ink)",
    colorNeutral: "var(--ink)",
    borderRadius: "12px",
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: "var(--paper)",
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-card)",
    },
    // Clerk v5 splits the card into a main area + a footer "card" on some flows.
    cardBox: {
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-card)",
    },
    headerTitle: {
      fontFamily: "'Newsreader', Georgia, serif",
      fontWeight: "500",
      letterSpacing: "-0.01em",
    },
    headerSubtitle: { color: "var(--ink-soft)" },
    socialButtonsBlockButton: {
      borderColor: "var(--line)",
      color: "var(--ink)",
    },
    dividerLine: { backgroundColor: "var(--line)" },
    dividerText: { color: "var(--ink-mute)" },
    formFieldLabel: { color: "var(--ink-soft)" },
    formFieldInput: { borderColor: "var(--line)" },
    footer: { background: "transparent" },
    footerActionText: { color: "var(--ink-mute)" },
    footerActionLink: { color: "var(--indigo)" },
    // UserButton popover
    userButtonPopoverCard: {
      backgroundColor: "var(--paper)",
      border: "1px solid var(--line)",
      boxShadow: "var(--shadow-card)",
    },
    userButtonPopoverActionButton: { color: "var(--ink-soft)" },
  },
} as const;
