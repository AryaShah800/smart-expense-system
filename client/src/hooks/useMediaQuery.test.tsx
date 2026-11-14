import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

type Listener = () => void;

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }));
  return (next: boolean) => {
    matches = next;
    listeners.forEach((fn) => fn());
  };
}

describe("useMediaQuery", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("returns the fallback when matchMedia is unavailable", () => {
    // @ts-expect-error simulate an environment without matchMedia (jsdom)
    window.matchMedia = undefined;
    expect(renderHook(() => useMediaQuery("(min-width: 768px)", true)).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery("(min-width: 768px)", false)).result.current).toBe(false);
  });

  it("reflects the current match and updates when the viewport crosses the breakpoint", () => {
    const setMatches = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => setMatches(true));
    expect(result.current).toBe(true);
  });
});
