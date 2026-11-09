import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Budgets from "./Budgets";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import type { BudgetProgress, BudgetWithCategory, Category } from "../types";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});
const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

const food: Category = { _id: "c-food", name: "Food", type: "expense" };
const rent: Category = { _id: "c-rent", name: "Rent", type: "expense" };
const salary: Category = { _id: "c-sal", name: "Salary", type: "income" };
const budgets: BudgetWithCategory[] = [{ _id: "b1", userId: "u1", categoryId: food, amount: 6000 }];
const status: BudgetProgress[] = [{ category: food, limit: 6000, spent: 6500, remaining: -500, exceeded: true }];

function respond(overrides: { status?: "fail" } = {}) {
  get.mockImplementation(async (url: string) => {
    if (url === "/categories") return { data: [food, rent, salary] };
    if (url === "/budgets") return { data: budgets };
    if (url === "/budgets/status") {
      if (overrides.status === "fail") throw new Error("status down");
      return { data: status };
    }
    throw new Error(`unexpected GET ${url}`);
  });
}

describe("Budgets", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("shows the budget with how much has been spent", async () => {
    respond();
    renderWithProviders(<Budgets />);
    expect((await screen.findAllByText("Food")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/6,500/).length).toBeGreaterThan(0);
  });

  it("still renders budgets when only the spending status request fails", async () => {
    respond({ status: "fail" });
    renderWithProviders(<Budgets />);
    expect((await screen.findAllByText("Food")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });

  it("reports a failed load with a retry control", async () => {
    get.mockRejectedValue(new Error("boom"));
    renderWithProviders(<Budgets />);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("saves a new limit with a numeric amount, then refetches budgets", async () => {
    respond();
    post.mockResolvedValue({ data: {} });
    renderWithProviders(<Budgets />);
    await screen.findAllByText("Food");
    const user = userEvent.setup();

    // The desktop form is always on the page; a modal repeats it for mobile.
    const [select] = screen.getAllByRole("combobox");
    expect(screen.queryByRole("option", { name: /salary/i })).not.toBeInTheDocument();
    await user.selectOptions(select, "c-rent");
    await user.type(screen.getAllByRole("spinbutton")[0], "12000");
    await user.click(select.closest("form")!.querySelector("button[type=submit]") as HTMLElement);

    await waitFor(() => expect(post).toHaveBeenCalledWith("/budgets", { categoryId: "c-rent", amount: 12000 }));
    const budgetCalls = () => get.mock.calls.filter(([url]) => url === "/budgets").length;
    await waitFor(() => expect(budgetCalls()).toBe(2));
  });
});
