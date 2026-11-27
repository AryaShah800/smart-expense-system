import { describe, expect, it, vi } from "vitest";
import { installStaleChunkReload } from "./staleChunkReload";

function setup(start = 1_000_000) {
  const target = new EventTarget();
  const reload = vi.fn();
  const store = new Map<string, string>();
  let time = start;
  const win = { addEventListener: target.addEventListener.bind(target), location: { reload } };
  installStaleChunkReload(win, { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) }, () => time);
  const fire = () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  return { reload, fire, advance: (ms: number) => (time += ms) };
}

describe("installStaleChunkReload", () => {
  it("reloads once when a lazy chunk from an old build is missing", () => {
    const { reload, fire } = setup();
    const event = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not loop: a second failure right after the reload shows the error instead", () => {
    const { reload, fire } = setup();
    fire();
    const second = fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it("reloads again for a later deploy", () => {
    const { reload, fire, advance } = setup();
    fire();
    advance(5 * 60_000);
    fire();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
