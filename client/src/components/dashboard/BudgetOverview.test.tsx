import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import BudgetOverview from "./BudgetOverview";
import { renderWithProviders } from "../../test/utils";
import { user } from "../../test/fixtures";
import type { BudgetStatus } from "../../types/models";

const status = [
  { category: { _id: "c1", name: "Food" }, limit: 500, spent: 650, remaining: -150, exceeded: true },
] as unknown as BudgetStatus[];

describe("BudgetOverview", () => {
  it("shows amounts in the user's currency, not always rupees", () => {
    renderWithProviders(<BudgetOverview budgetStatus={status} />, {
      preloadedState: { auth: { user: { ...user, currency: "USD" } } },
    });
    expect(screen.getByText(/\$650/)).toBeInTheDocument();
    expect(screen.getByText(/Over budget by \$150/)).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });
});
