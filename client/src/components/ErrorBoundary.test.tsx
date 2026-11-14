import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import { reportError } from "../lib/sentry";

vi.mock("../lib/sentry", () => ({ reportError: vi.fn() }));

function Broken(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("shows the fallback and reports the error with its component stack", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
    const [error, componentStack] = vi.mocked(reportError).mock.calls[0]!;
    expect((error as Error).message).toBe("boom");
    expect(componentStack).toContain("Broken");
  });
});
