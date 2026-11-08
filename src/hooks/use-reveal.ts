import { useEffect, useRef } from "react";

/**
 * Marks an element `data-revealed="true"` the first time it scrolls into view; pairs with the
 * `reveal` utility in styles.css. Children carrying `reveal` are revealed together, each
 * keeping its own --delay, so one observer drives a whole staggered section.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = [root, ...Array.from(root.querySelectorAll<HTMLElement>(".reveal"))];
    const show = () => targets.forEach((el) => el.setAttribute("data-revealed", "true"));

    if (typeof IntersectionObserver === "undefined") return show();
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return ref;
}
