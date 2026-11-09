import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionableInsights from "./ActionableInsights";
import { renderWithProviders } from "../../test/utils";
import type { Insight } from "../../types";

const insights: Insight[] = [
  { id: "a", type: "warning", icon: "⚠️", category: "Food", title: "Food is over budget", message: "You spent 20% more", actionFilter: "Food & Dining", actionText: "See food spend" },
  { id: "b", type: "info", icon: "💡", category: "Savings", title: "Nice saving streak", message: "Keep going", actionLink: "/budgets" },
];

describe("ActionableInsights", () => {
  it("shows an empty state with a refresh button", async () => {
    const onRefresh = vi.fn();
    renderWithProviders(<ActionableInsights insights={[]} onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByTitle("Refresh insights"));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("renders each insight and links to filtered expenses or a page", () => {
    renderWithProviders(<ActionableInsights insights={insights} />);
    expect(screen.getByText("Food is over budget")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see food spend/i })).toHaveAttribute(
      "href",
      "/expenses?category=Food%20%26%20Dining"
    );
    expect(screen.getByRole("link", { name: /view details/i })).toHaveAttribute("href", "/budgets");
  });

  it("lets the user dismiss a single insight", async () => {
    renderWithProviders(<ActionableInsights insights={insights} />);
    const [firstDismiss] = screen.getAllByLabelText("Dismiss insight");
    await userEvent.setup().click(firstDismiss);
    expect(screen.queryByText("Food is over budget")).not.toBeInTheDocument();
    expect(screen.getByText("Nice saving streak")).toBeInTheDocument();
  });
});
