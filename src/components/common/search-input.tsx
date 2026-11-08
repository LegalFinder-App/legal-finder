import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
  tone = "surface",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  tone?: "ink" | "surface";
}) {
  const ink = tone === "ink";
  return (
    <div className={cn("group relative w-full max-w-xl", className)}>
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 transition-colors",
          ink ? "text-ink-foreground/50" : "text-muted-foreground group-focus-within:text-brass",
        )}
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-13 w-full rounded-full border pl-11 pr-11 text-base transition-[border-color,box-shadow] duration-150 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden",
          ink
            ? "surface-glass-ink text-ink-foreground placeholder:text-ink-foreground/50 focus:border-brass focus:ring-[3px] focus:ring-brass/25"
            : "border-border bg-card text-foreground shadow-plate placeholder:text-muted-foreground hover:border-foreground/20 focus:border-ring focus:ring-[3px] focus:ring-ring/20",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={cn(
            "absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition-colors",
            ink
              ? "text-ink-foreground/60 hover:bg-ink-foreground/10"
              : "text-muted-foreground hover:bg-secondary",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
