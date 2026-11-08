import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePressed } from "./use-pressed";

/*
 * Which button to use:
 *  - <Button> (ui/button.tsx): the default — forms, dialogs, tables, settings, everyday actions,
 *    including sign-in/sign-up submits.
 *  - <MetalButton variant="gold">: the ONE most important action on a key landing section
 *    (hero "Find an advocate", the closing call to action). Use sparingly — at most one per
 *    view — or it stops feeling special. `primary` (ink) exists for light surfaces.
 *  - <LiquidButton> (ui/liquid-button.tsx): secondary actions sitting on rich backgrounds —
 *    the hero aurora, photos, glass panels. Never on flat white or flat dark surfaces.
 */

const metalSizes = cva("metal-face", {
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

export interface MetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof metalSizes> {
  variant?: "gold" | "primary";
  /** Classes for the outer rim — put layout here (w-full, flex-1, self-start…). */
  wrapperClassName?: string;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Render the face as the single child (e.g. a router <Link>); icons go inside that child. */
  asChild?: boolean;
}

export const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(
  (
    {
      variant = "gold",
      size,
      className,
      wrapperClassName,
      loading = false,
      disabled,
      leadingIcon,
      trailingIcon,
      asChild = false,
      type,
      children,
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
      <span
        className={cn("metal-rim", wrapperClassName)}
        data-variant={variant}
        data-disabled={isDisabled || undefined}
      >
        <Comp
          ref={ref}
          data-variant={variant}
          className={cn(metalSizes({ size }), className)}
          {...(asChild ? {} : { type: type ?? "button", disabled: isDisabled })}
          aria-busy={loading || undefined}
          aria-disabled={asChild && isDisabled ? true : undefined}
          {...props}
          {...pressProps}
        >
          {asChild ? (
            children
          ) : (
            <>
              {loading ? <Loader2 className="animate-spin" aria-hidden /> : leadingIcon}
              {children}
              {!loading && trailingIcon}
            </>
          )}
        </Comp>
      </span>
    );
  },
);
MetalButton.displayName = "MetalButton";
