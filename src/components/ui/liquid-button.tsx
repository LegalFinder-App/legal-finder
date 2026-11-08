import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackSpotlight } from "@/lib/motion";
import { usePressed } from "./use-pressed";

/*
 * Glass button for secondary actions on rich backgrounds (hero aurora, photos, glass panels).
 * See metal-button.tsx for when to use Standard vs Metal vs Liquid.
 *
 * Glass is plain CSS (backdrop blur + saturate + specular borders), so it looks the same in
 * Safari, Firefox and Samsung Internet. On capable Chromium desktops,
 * enableLiquidGlassRefraction() adds a real refraction (SVG displacement) on top — the filter is
 * rendered once by <LiquidGlassFilter/> in the root document, never per button.
 */

const liquidSizes = cva("liquid-glass", {
  variants: {
    size: {
      sm: "h-10 px-4 text-[0.8125rem] sm:h-9",
      default: "h-11 px-6 text-sm",
      lg: "h-12 px-7 text-[0.9375rem]",
      xl: "h-[3.25rem] px-8 text-[0.95rem]",
    },
  },
  defaultVariants: { size: "default" },
});

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof liquidSizes> {
  shape?: "pill" | "rounded";
  loading?: boolean;
  /** Render as the single child (e.g. a router <Link>). */
  asChild?: boolean;
}

export const LiquidButton = React.forwardRef<HTMLButtonElement, LiquidButtonProps>(
  (
    {
      size,
      shape = "pill",
      className,
      loading = false,
      disabled,
      asChild = false,
      type,
      children,
      onPointerMove,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      onKeyDown,
      onKeyUp,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const { pressProps } = usePressed<HTMLButtonElement>({
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      onKeyDown,
      onKeyUp,
      onBlur,
    });
    const isDisabled = disabled || loading;
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-shape={shape}
        className={cn(liquidSizes({ size }), className)}
        {...(asChild ? {} : { type: type ?? "button", disabled: isDisabled })}
        aria-busy={loading || undefined}
        aria-disabled={asChild && isDisabled ? true : undefined}
        {...props}
        {...pressProps}
        onPointerMove={(e: React.PointerEvent<HTMLButtonElement>) => {
          onPointerMove?.(e);
          if (e.pointerType === "mouse") trackSpotlight(e);
        }}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
LiquidButton.displayName = "LiquidButton";

/** The refraction filter, rendered once at the document root. */
export function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      <filter
        id="lf-liquid-glass"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.022"
          numOctaves="1"
          seed="7"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="soft"
          scale="26"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/**
 * Turns on SVG refraction only where it is supported and affordable: Chromium (the only engine
 * that applies url() in backdrop-filter), a fine pointer, 4+ cores, no reduced-motion or
 * data-saver preference. Everyone else keeps the CSS glass.
 */
export function enableLiquidGlassRefraction() {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & {
    userAgentData?: { brands?: { brand: string }[] };
    connection?: { saveData?: boolean };
  };
  const chromium = nav.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand)) ?? false;
  const capable =
    chromium &&
    (nav.hardwareConcurrency ?? 0) >= 4 &&
    !nav.connection?.saveData &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.toggle("liquid-svg", capable);
}
