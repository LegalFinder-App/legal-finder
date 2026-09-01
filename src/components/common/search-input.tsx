import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
  tone = "ink",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  tone?: "ink" | "surface";
}) {
  return (
    <div className={cn("relative max-w-xl", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
          tone === "ink" ? "text-ink-foreground/40" : "text-muted-foreground",
        )}
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-md border pl-10 pr-4 text-sm focus:outline-none",
          tone === "ink"
            ? "border-ink-foreground/20 bg-ink-foreground/5 text-ink-foreground placeholder:text-ink-foreground/40 focus:border-brass"
            : "border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-brass",
        )}
      />
    </div>
  );
}
