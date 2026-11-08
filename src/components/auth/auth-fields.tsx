import {
  useId,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordStrength, suggestEmail } from "./auth-utils";

/* ---------- helpers ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** On phones, keep the focused field above the on-screen keyboard. */
function keepInView(el: HTMLElement) {
  if (typeof window === "undefined" || window.innerWidth >= 768) return;
  window.setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 280);
}

/* ---------- building blocks ---------- */

export function FieldShell({
  id,
  label,
  aside,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}

const fieldInput =
  "flex h-12 w-full rounded-xl border border-input bg-background/60 pl-11 pr-4 text-base shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)] transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 hover:border-foreground/25 focus:border-ring focus:bg-card focus:outline-none focus:ring-[4px] focus:ring-ring/15 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15 disabled:opacity-60 sm:text-[0.9375rem]";

export function IconInput({
  icon: Icon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <div className="group relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brass"
      />
      <input
        {...props}
        onFocus={(e) => {
          props.onFocus?.(e);
          keepInView(e.currentTarget);
        }}
        className={cn(fieldInput, className)}
      />
    </div>
  );
}

/* ---------- email ---------- */

export function EmailField({
  value,
  onChange,
  id: idProp,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  autoFocus?: boolean;
}) {
  const auto = useId();
  const id = idProp ?? `email-${auto}`;
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.length > 0 && !EMAIL_RE.test(value);
  const suggestion = suggestEmail(value);

  return (
    <FieldShell
      id={id}
      label="Email"
      error={invalid ? "Enter a valid email address, like name@example.com." : null}
      hint={
        suggestion ? (
          <p className="text-xs text-muted-foreground">
            Did you mean{" "}
            <button
              type="button"
              onClick={() => onChange(suggestion)}
              className="font-semibold text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
            >
              {suggestion}
            </button>
            ?
          </p>
        ) : null
      }
    >
      <IconInput
        icon={Mail}
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={255}
        autoFocus={autoFocus}
        placeholder="you@example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
    </FieldShell>
  );
}

/* ---------- password ---------- */

export function PasswordField({
  value,
  onChange,
  label = "Password",
  autoComplete,
  showStrength = false,
  aside,
  id: idProp,
  invalidMessage,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  autoComplete: "current-password" | "new-password";
  showStrength?: boolean;
  aside?: ReactNode;
  id?: string;
  invalidMessage?: string | null;
}) {
  const auto = useId();
  const id = idProp ?? `password-${auto}`;
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const strength = passwordStrength(value);
  const detectCaps = (e: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <FieldShell
      id={id}
      label={label}
      aside={aside}
      error={invalidMessage}
      hint={
        <>
          {capsLock && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground dark:text-warning">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Caps Lock is on
            </p>
          )}
          {showStrength && value.length > 0 && (
            <div className="flex items-center gap-2.5 pt-0.5" aria-live="polite">
              <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-full flex-1 rounded-full transition-colors duration-300",
                      i < strength.score
                        ? strength.score <= 1
                          ? "bg-destructive"
                          : strength.score === 2
                            ? "bg-warning"
                            : "bg-success"
                        : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs font-medium text-muted-foreground">
                <span className="sr-only">Password strength: </span>
                {strength.label}
              </span>
            </div>
          )}
          {showStrength && value.length > 0 && strength.score < 3 && (
            <p className="text-xs text-muted-foreground">
              Use 12+ characters with upper and lower case, a number and a symbol.
            </p>
          )}
        </>
      }
    >
      <div className="group relative">
        <Lock
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brass"
        />
        <input
          id={id}
          name={autoComplete === "new-password" ? "new-password" : "password"}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={6}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onFocus={(e) => keepInView(e.currentTarget)}
          onBlur={() => setCapsLock(false)}
          aria-invalid={invalidMessage ? true : undefined}
          aria-describedby={invalidMessage ? `${id}-error` : undefined}
          className={cn(fieldInput, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldShell>
  );
}

/* ---------- one-time code ---------- */

export function CodeField({
  value,
  onChange,
  backup = false,
  id = "verification-code",
}: {
  value: string;
  onChange: (v: string) => void;
  backup?: boolean;
  id?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {backup ? "Backup code" : "Verification code"}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(backup ? e.target.value : e.target.value.replace(/\D/g, ""))}
        required
        autoFocus
        // Backup codes are alphanumeric and longer than the 6-digit one-time codes.
        inputMode={backup ? "text" : "numeric"}
        autoComplete="one-time-code"
        maxLength={backup ? 16 : 6}
        placeholder={backup ? "xxxx-xxxx" : "••••••"}
        onFocus={(e) => keepInView(e.currentTarget)}
        className="h-16 w-full rounded-2xl border border-input bg-background/60 px-4 text-center font-mono text-2xl font-semibold tracking-[0.5em] shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)] transition-[border-color,box-shadow] placeholder:tracking-[0.35em] placeholder:text-muted-foreground/50 focus:border-ring focus:bg-card focus:outline-none focus:ring-[4px] focus:ring-ring/15"
      />
    </div>
  );
}

/* ---------- social ---------- */

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function SocialButton({
  provider,
  onClick,
  disabled,
}: {
  provider: "google" | "apple" | "linkedin";
  onClick: () => void;
  disabled?: boolean;
}) {
  const label = { google: "Google", apple: "Apple", linkedin: "LinkedIn" }[provider];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Continue with ${label}`}
      className="press inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold shadow-xs transition-colors hover:border-foreground/20 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {provider === "google" ? (
        <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
          />
        </svg>
      ) : provider === "apple" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-[1.15rem] w-[1.15rem] fill-current"
          aria-hidden="true"
        >
          <path d="M16.37 12.78c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.27-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65l.03-.03ZM14.1 6.03c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#0A66C2" />
          <path
            fill="#fff"
            d="M7.1 9.6H4.6V19h2.5V9.6ZM5.9 5a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm13.5 8.6c0-2.6-.6-4.2-3.3-4.2-1.3 0-2.2.7-2.6 1.4h-.04V9.6h-2.4V19h2.5v-4.6c0-1.2.2-2.4 1.7-2.4 1.5 0 1.5 1.4 1.5 2.5V19h2.5v-5.4Z"
          />
        </svg>
      )}
      <span className="hidden min-[400px]:inline">{label}</span>
    </button>
  );
}
