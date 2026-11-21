import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlowLoad } from "./useSlowLoad";

afterEach(() => vi.useRealTimers());

describe("useSlowLoad", () => {
  it("turns true only after the delay while loading", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSlowLoad(true, 5000));
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });
  it("resets when loading finishes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ l }) => useSlowLoad(l, 1000), { initialProps: { l: true } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(true);
    rerender({ l: false });
    expect(result.current).toBe(false);
  });
});
