import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionableInsights from "./ActionableInsights";
import { renderWithProviders } from "../../test/utils";
import type { Insight } from "../../types/models";

const make = (id: string, type: Insight["type"]): Insight =>
  ({ id, type, category: id, title: `Title ${id}`, message: "m" }) as Insight;

describe("ActionableInsights", () => {
  const five = [make("a", "success"), make("b", "info"), make("c", "warning"), make("d", "danger"), make("e", "info")];

  it("shows the four most urgent insights and offers the rest", async () => {
    renderWithProviders(<ActionableInsights insights={five} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("Title d");
    expect(screen.queryByText("Title a")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show 1 more/i }));
    expect(screen.getByText("Title a")).toBeInTheDocument();
  });

  it("shows no toggle for four or fewer", () => {
    renderWithProviders(<ActionableInsights insights={five.slice(0, 4)} />);
    expect(screen.queryByRole("button", { name: /show/i })).not.toBeInTheDocument();
  });
});
