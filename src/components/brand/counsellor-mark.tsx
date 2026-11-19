import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Decorative size hint for Lucide-compatible call sites. */
  size?: number | string;
  title?: string;
};

/**
 * Counsellor AI mark — a lawyer-robot (scales + headset) drawn as an inline SVG so it
 * inherits currentColor / brass the same way Lucide icons do in the sidebar.
 */
export function CounsellorMark({ className, size, title }: Props) {
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      style={dim ? { width: dim, height: dim } : undefined}
    >
      {/* Antenna */}
      <circle cx="12" cy="2.6" r="1.15" fill="currentColor" opacity="0.9" />
      <path d="M12 3.7V5.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Head / helmet */}
      <rect
        x="5.25"
        y="5.4"
        width="13.5"
        height="10.2"
        rx="3.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Visor */}
      <path
        d="M7.4 9.1h9.2c.55 0 1 .45 1 1v1.35c0 .55-.45 1-1 1H7.4c-.55 0-1-.45-1-1V10.1c0-.55.45-1 1-1Z"
        fill="currentColor"
        opacity="0.18"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      {/* Eyes */}
      <circle cx="9.35" cy="10.75" r="0.95" fill="currentColor" />
      <circle cx="14.65" cy="10.75" r="0.95" fill="currentColor" />
      {/* Ear buds / headset */}
      <path
        d="M5.25 10.2H4.1c-.5 0-.9.4-.9.9v1.5c0 .5.4.9.9.9H5.25"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M18.75 10.2H19.9c.5 0 .9.4.9.9v1.5c0 .5-.4.9-.9.9H18.75"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      {/* Scales of justice under chin */}
      <path
        d="M12 15.4v2.05M8.6 17.45h6.8"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M8.6 17.45c0 .95-.7 1.7-1.55 1.7S5.5 18.4 5.5 17.45c0-.55.9-1.55 1.55-1.55s1.55 1 1.55 1.55ZM18.5 17.45c0 .95-.7 1.7-1.55 1.7s-1.55-.75-1.55-1.7c0-.55.9-1.55 1.55-1.55s1.55 1 1.55 1.55Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Collar / body hint */}
      <path
        d="M9.2 21.1c.85-1.35 1.9-2 2.8-2s1.95.65 2.8 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lucide-shaped wrapper for nav-config (`icon: CounsellorNavIcon`). */
export function CounsellorNavIcon({
  className,
  size = 16,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return <CounsellorMark className={className} size={size} {...rest} />;
}
