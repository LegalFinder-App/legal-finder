import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";
import { Stars } from "./bits";
import { Badge } from "@/components/ui/badge";
import type { Lawyer } from "@/lib/queries";

export function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  return (
    <Link
      to="/lawyers/$lawyerId"
      params={{ lawyerId: lawyer.id }}
      className="group flex flex-col rounded-lg border border-border bg-card p-5 shadow-plate transition-all hover:-translate-y-0.5 hover:shadow-raised"
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary ring-1 ring-border">
          {lawyer.photo_url ? (
            <img
              src={lawyer.photo_url}
              alt={lawyer.full_name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center font-display text-lg font-semibold text-muted-foreground">
              {lawyer.full_name.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold group-hover:text-brass">
              {lawyer.full_name}
            </h3>
            {lawyer.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-brass" />}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {lawyer.headline ?? lawyer.firm ?? "Advocate"}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Stars value={lawyer.rating} />
            <span className="tabular-nums">
              {lawyer.rating.toFixed(1)} · {lawyer.review_count} reviews
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {lawyer.practice_areas.slice(0, 3).map((a) => (
          <Badge key={a} variant="brass">
            {a}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[lawyer.city, lawyer.county].filter(Boolean).join(", ") || "Remote"}
        </span>
        <span className="font-mono">
          {lawyer.consultation_fee ? `KES ${lawyer.consultation_fee.toLocaleString()}` : "Enquire"}
        </span>
      </div>
    </Link>
  );
}