import { useEffect, useState } from "react";

/**
 * The current time as render-safe state, refreshed periodically. Calling Date.now() directly in a
 * component body makes the render impure (React Compiler flags it) and lists like "upcoming
 * appointments" would never roll over while the screen stays open.
 */
export function useNow(refreshMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);
  return now;
}
