import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import AddTransaction from "./AddTransaction";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import type { Category } from "../types";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});
const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

const categories: Category[] = [
  { _id: "c-food", name: "Food", type: "expense" },
  { _id: "c-rent", name: "Rent", type: "expense" },
  { _id: "c-salary", name: "Salary", type: "income" },
];

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/add-transaction" element={<AddTransaction />} />
      <Route path="/expenses" element={<p>Expenses page</p>} />
      <Route path="/recurring" element={<p>Recurring page</p>} />
    </Routes>,
    { route: "/add-transaction" }
  );
}

const submit = () => screen.getAllByRole("button", { name: /save transaction/i })[0];
// The browser's own constraint checks (required, min) stop most bad input before React sees it.
// Submitting the form element directly exercises the component's own validation as the second layer.
const submitForm = () => fireEvent.submit(document.getElementById("add-transaction-form") as HTMLFormElement);

describe("AddTransaction", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    get.mockResolvedValue({ data: categories });
  });

  it("only offers categories that match the selected type", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("option", { name: /food/i });
    expect(screen.queryByRole("option", { name: /salary/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /income/i }));
    expect(await screen.findByRole("option", { name: /salary/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /food/i })).not.toBeInTheDocument();
  });

  it("rejects an empty amount without calling the API", async () => {
    renderPage();
    await screen.findByRole("option", { name: /food/i });

    submitForm();

    expect(screen.getByText("Please enter a valid amount greater than 0")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("blocks an empty submit natively before any request is made", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("option", { name: /food/i });

    await user.click(submit());

    expect(post).not.toHaveBeenCalled();
  });

  it("rejects a zero amount", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("option", { name: /food/i });

    await user.type(screen.getByPlaceholderText("0"), "0");
    submitForm();

    expect(screen.getByText("Please enter a valid amount greater than 0")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("ignores minus and exponent keys in the amount field", async () => {
    const user = userEvent.setup();
    renderPage();
    const amount = screen.getByPlaceholderText("0");
    await user.type(amount, "-1e5");
    expect(amount).toHaveValue(15);
  });

  it("requires a category", async () => {
    get.mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(get).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText("0"), "250");
    submitForm();

    expect(await screen.findByText("Please select a category")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("posts the transaction with the preselected category and goes to the list", async () => {
    post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("option", { name: /food/i });

    await user.type(screen.getByPlaceholderText("0"), "250");
    await user.type(screen.getByPlaceholderText(/dinner with friends/i), "  Lunch  ");
    await user.click(submit());

    expect(await screen.findByText("Expenses page")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        amount: 250,
        type: "expense",
        categoryId: "c-food",
        description: "Lunch",
        isRecurring: false,
      })
    );
  });

  it("shows the server's error and stays on the page when saving fails", async () => {
    const { AxiosError } = await import("axios");
    post.mockRejectedValue(
      new AxiosError("bad", "ERR", undefined, undefined, { status: 400, data: { message: "Amount exceeds limit" } } as never)
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("option", { name: /food/i });

    await user.type(screen.getByPlaceholderText("0"), "5");
    await user.click(submit());

    expect(await screen.findByText("Amount exceeds limit")).toBeInTheDocument();
    expect(screen.queryByText("Expenses page")).not.toBeInTheDocument();
  });
});
