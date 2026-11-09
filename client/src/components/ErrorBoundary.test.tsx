import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Boom(): never {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(<ErrorBoundary><p>All good</p></ErrorBoundary>);
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("replaces a crashed subtree with a recovery screen", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.queryByText("All good")).not.toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
