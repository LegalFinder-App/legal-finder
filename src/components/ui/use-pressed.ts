import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

type PressHandlers<T> = {
  onPointerDown?: (e: PointerEvent<T>) => void;
  onPointerUp?: (e: PointerEvent<T>) => void;
  onPointerLeave?: (e: PointerEvent<T>) => void;
  onPointerCancel?: (e: PointerEvent<T>) => void;
  onKeyDown?: (e: KeyboardEvent<T>) => void;
  onKeyUp?: (e: KeyboardEvent<T>) => void;
  onBlur?: (e: FocusEvent<T>) => void;
};

/**
 * Pressed state for the premium buttons, so the press animation also shows for Space/Enter
 * (a link's :active never fires for Enter). The caller's own handlers always run first and are
 * never replaced — the bug this guards against in the original MetalButton.
 */
export function usePressed<T extends HTMLElement>(handlers: PressHandlers<T>) {
  const [pressed, setPressed] = useState(false);
  const isActivationKey = (key: string) => key === " " || key === "Enter";

  return {
    pressed,
    pressProps: {
      "data-pressed": pressed || undefined,
      onPointerDown: (e: PointerEvent<T>) => {
        handlers.onPointerDown?.(e);
        setPressed(true);
      },
      onPointerUp: (e: PointerEvent<T>) => {
        handlers.onPointerUp?.(e);
        setPressed(false);
      },
      onPointerLeave: (e: PointerEvent<T>) => {
        handlers.onPointerLeave?.(e);
        setPressed(false);
      },
      onPointerCancel: (e: PointerEvent<T>) => {
        handlers.onPointerCancel?.(e);
        setPressed(false);
      },
      onKeyDown: (e: KeyboardEvent<T>) => {
        handlers.onKeyDown?.(e);
        if (isActivationKey(e.key) && !e.repeat) setPressed(true);
      },
      onKeyUp: (e: KeyboardEvent<T>) => {
        handlers.onKeyUp?.(e);
        if (isActivationKey(e.key)) setPressed(false);
      },
      onBlur: (e: FocusEvent<T>) => {
        handlers.onBlur?.(e);
        setPressed(false);
      },
    },
  };
}
