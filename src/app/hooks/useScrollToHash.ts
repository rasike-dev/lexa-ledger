import { useEffect } from "react";

export function useScrollToHash(deps: unknown[] = []) {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });

      // Flash highlight
      el.classList.add("anchor-flash");
      window.setTimeout(() => {
        el.classList.remove("anchor-flash");
      }, 1300);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
