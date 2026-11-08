import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FilterChipGroupProps {
  label?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  allLabel?: string;
  variant?: "pill" | "block";
  className?: string;
}

/**
 * Generalizes the pill/chip filter pattern that used to be reimplemented per page
 * (lawyers directory, advice hub, library). Supports single- or multi-select.
 */
export function FilterChipGroup({
  label,
  options,
  value,
  onChange,
  multiple = false,
  allLabel,
  variant = "pill",
  className,
}: FilterChipGroupProps) {
  if (options.length === 0) return null;

  const toggle = (option: string) => {
    if (multiple) {
      onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
    } else {
      onChange(value[0] === option ? [] : [option]);
    }
  };

  return (
    <div className={className}>
      {label && <p className="eyebrow text-muted-foreground">{label}</p>}
      <div
        className={cn(
          "flex flex-wrap gap-1.5",
          label && "mt-3",
          variant === "block" && "lg:flex-col lg:items-start",
        )}
      >
        {allLabel && (
          <Chip active={value.length === 0} onClick={() => onChange([])} variant={variant}>
            {allLabel}
          </Chip>
        )}
        {options.map((option) => (
          <Chip
            key={option}
            active={value.includes(option)}
            onClick={() => toggle(option)}
            variant={variant}
          >
            {option}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: "pill" | "block";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press text-sm",
        variant === "pill"
          ? "inline-flex min-h-10 items-center rounded-full border px-4"
          : "inline-flex min-h-10 items-center rounded-full border px-3.5 text-left lg:min-h-9 lg:w-full lg:rounded-xl lg:border-transparent",
        active
          ? "border-primary bg-primary font-semibold text-primary-foreground shadow-xs"
          : cn(
              "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              variant === "block" && "lg:bg-transparent lg:hover:bg-secondary",
            ),
      )}
    >
      {children}
    </button>
  );
}
