import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import SummaryCards from "./SummaryCards";
import { renderWithProviders } from "../../test/utils";

describe("SummaryCards", () => {
  it("formats the three totals in the user's currency", () => {
    renderWithProviders(<SummaryCards income={55000} expense={12345} balance={42655} />, {
      user: { _id: "u", username: "A", email: "a@a.com", currency: "USD" },
    });
    expect(screen.getByText("$55,000")).toBeInTheDocument();
    expect(screen.getByText("$12,345")).toBeInTheDocument();
    expect(screen.getByText("$42,655")).toBeInTheDocument();
  });

  it("defaults to rupees with Indian digit grouping", () => {
    renderWithProviders(<SummaryCards income={1234567} expense={0} balance={1234567} />);
    expect(screen.getAllByText("₹12,34,567")).toHaveLength(2);
    expect(screen.getByText("₹0")).toBeInTheDocument();
  });
});
