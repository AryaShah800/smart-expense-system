import { useEffect, useState } from "react";

/** True once `loading` has stayed true for `delayMs` (e.g. a free-tier API cold start). */
export function useSlowLoad(loading: boolean, delayMs = 5000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setSlow(true), delayMs);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [loading, delayMs]);
  return loading && slow;
}
