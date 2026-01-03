// 📄 File: src/pages/TemplateBuilder/hooks/useDebouncedEffect.js
import { useEffect, useRef } from "react";

/**
 * Runs effectFn after `delayMs` once deps stop changing.
 * Avoids spam-saving and keeps perf crisp.
 */
export default function useDebouncedEffect(effectFn, deps, delayMs = 600) {
  const timeoutRef = useRef(null);
  const firstRunRef = useRef(true);

  useEffect(() => {
    // Skip first run by default (useful for autosave after initial load)
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => effectFn(), delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
