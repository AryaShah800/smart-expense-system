import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataErrorState from "./DataErrorState";

describe("DataErrorState", () => {
  it("shows default copy and no retry button without a handler", () => {
    render(<DataErrorState />);
    expect(screen.getByText("Unable to connect to server")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("shows custom copy and calls onRetry", async () => {
    const onRetry = vi.fn();
    render(<DataErrorState title="Budgets Unavailable" message="Server is down" onRetry={onRetry} />);
    expect(screen.getByText("Budgets Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Server is down")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
