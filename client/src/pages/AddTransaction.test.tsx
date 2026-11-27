import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import AddTransaction from "./AddTransaction";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import type { Category } from "../types/models";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn() } };
});

const categories: Category[] = [
  { _id: "c1", name: "Food", type: "expense", user: null, icon: "", color: "", createdAt: "" },
  { _id: "c2", name: "Salary", type: "income", user: null, icon: "", color: "", createdAt: "" },
];

describe("AddTransaction", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue({ data: categories });
  });

  it("starts as income with the first income category from the URL", async () => {
    renderWithProviders(<AddTransaction />, { route: "/add-transaction?type=income" });

    expect(screen.getByRole("button", { name: "Income" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Expense" })).not.toHaveClass("active");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("c2"));
    expect(screen.getByRole("option", { name: "Salary" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Food" })).not.toBeInTheDocument();
  });

  it.each(["?type=bogus", "?type=expense", ""])("starts as expense for %s", async (search) => {
    renderWithProviders(<AddTransaction />, { route: `/add-transaction${search}` });

    expect(screen.getByRole("button", { name: "Expense" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Income" })).not.toHaveClass("active");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("c1"));
    expect(screen.queryByRole("option", { name: "Salary" })).not.toBeInTheDocument();
  });
});
