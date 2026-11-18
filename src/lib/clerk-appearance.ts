/**
 * Clerk appearance tokens aligned with LegalFinder's auth surfaces (ink / brass, Plus Jakarta,
 * rounded-xl fields). Used on hosted Clerk UI that still has to render inside our AuthShell —
 * notably TaskSetupMFA on /session-tasks/setup-mfa.
 *
 * Hex values mirror `src/design/tokens.json` light theme (Clerk's appearance API wants hex).
 */
export const legalFinderClerkAppearance = {
  variables: {
    colorPrimary: "#13213a",
    colorText: "#111b2b",
    colorTextSecondary: "#59616d",
    colorBackground: "transparent",
    colorInputBackground: "rgba(248, 250, 252, 0.6)",
    colorInputText: "#111b2b",
    colorNeutral: "#59616d",
    colorDanger: "#b42318",
    colorSuccess: "#1f6b3a",
    borderRadius: "0.75rem",
    fontFamily: '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: "w-full! font-[family-name:var(--font-sans)]",
    cardBox: "w-full! shadow-none! border-0! bg-transparent!",
    card: "w-full! shadow-none! border-0! bg-transparent! p-0! gap-3!",
    // AuthShell already owns the page title/copy — hide Clerk's duplicate header chrome.
    header: "hidden!",
    headerTitle: "hidden!",
    headerSubtitle: "hidden!",
    main: "gap-3!",
    form: "gap-4!",
    formFieldLabel:
      "text-sm! font-semibold! text-foreground! normal-case! tracking-normal!",
    formFieldInput:
      "h-12! rounded-xl! border! border-input! bg-background/60! text-base! shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)]! transition-[border-color,box-shadow,background-color]! hover:border-foreground/25! focus:border-ring! focus:bg-card! focus:ring-[4px]! focus:ring-ring/15!",
    formButtonPrimary:
      "h-12! rounded-xl! bg-primary! text-primary-foreground! text-sm! font-semibold! shadow-xs! hover:opacity-95! normal-case! tracking-normal!",
    // MFA method picker rows (SMS / Authenticator) — match signup role cards.
    button:
      "min-h-14! justify-start! gap-3! rounded-2xl! border! border-border! bg-card! px-4! py-3! text-left! text-sm! font-semibold! text-foreground! shadow-xs! transition-[border-color,background-color,box-shadow]! hover:border-brass/50! hover:bg-accent/60! normal-case! tracking-normal!",
    alternativeMethodsBlockButton:
      "min-h-14! justify-start! gap-3! rounded-2xl! border! border-border! bg-card! px-4! py-3! text-left! text-sm! font-semibold! text-foreground! shadow-xs! hover:border-brass/50! hover:bg-accent/60! normal-case!",
    identityPreview:
      "rounded-2xl! border! border-border! bg-secondary/70! px-3! py-2.5! text-sm!",
    identityPreviewText: "text-sm! font-medium! text-foreground!",
    identityPreviewEditButton: "text-sm! font-semibold! text-brass! hover:underline!",
    footer: "bg-transparent! shadow-none! after:hidden! before:hidden!",
    footerAction: "bg-transparent!",
    footerActionLink: "text-brass! font-semibold!",
    footerActionText: "text-muted-foreground!",
    // Soften Clerk branding so the shell reads as LegalFinder first.
    footerPages: "hidden!",
    badge: "bg-accent! text-accent-foreground! rounded-full!",
    otpCodeFieldInput:
      "h-12! w-10! rounded-xl! border! border-input! text-base! font-semibold!",
    formFieldSuccessText: "text-xs! text-success!",
    formFieldErrorText: "text-xs! font-medium! text-destructive!",
    spinner: "text-brass!",
    alert: "rounded-xl! border! border-border! bg-secondary/70!",
    alertText: "text-sm! text-foreground!",
  },
} as const;
