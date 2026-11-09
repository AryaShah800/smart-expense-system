import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BudgetOverview from "./BudgetOverview";
import type { BudgetProgress } from "../../types";

const row = (name: string, spent: number, limit: number): BudgetProgress => ({
  category: { _id: name, name, type: "expense" },
  spent,
  limit,
  remaining: limit - spent,
  exceeded: spent > limit,
});

describe("BudgetOverview", () => {
  it("renders nothing without budgets", () => {
    const { container } = render(<BudgetOverview budgetStatus={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows remaining percentage for a budget within its limit", () => {
    render(<BudgetOverview budgetStatus={[row("Food", 2500, 10000)]} />);
    expect(screen.getByText("75% remaining")).toBeInTheDocument();
  });

  it("flags an exceeded budget with the overspend amount and a danger bar", () => {
    const { container } = render(<BudgetOverview budgetStatus={[row("Food", 6500, 6000)]} />);
    expect(screen.getByText("Exceeded by 500")).toBeInTheDocument();
    expect(container.querySelector(".progress-fill.danger")).toBeInTheDocument();
  });

  it("uses the warning style above 80% and caps the bar at 100%", () => {
    const { container } = render(<BudgetOverview budgetStatus={[row("Food", 9000, 10000), row("Rent", 99999, 100)]} />);
    expect(container.querySelector(".progress-fill.warning")).toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>(".progress-fill");
    expect(bars[1].style.width).toBe("100%");
  });
});
