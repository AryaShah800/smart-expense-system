import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import Expenses from "./Expenses";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import type { TransactionWithCategory } from "../types";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn(), delete: vi.fn() } };
});
vi.mock("../utils/exportPdf", () => ({ exportTransactionsPdf: vi.fn() }));
const get = vi.mocked(api.get);
const del = vi.mocked(api.delete);

const food = { _id: "c1", name: "Food", type: "expense" as const };
const salary = { _id: "c2", name: "Salary", type: "income" as const };
const tx = (over: Partial<TransactionWithCategory>): TransactionWithCategory => ({
  _id: "t",
  userId: "u1",
  categoryId: food,
  type: "expense",
  amount: 100,
  date: "2026-03-10T12:00:00.000Z",
  description: "",
  ...over,
});
const data = [
  tx({ _id: "t1", description: "Lunch at cafe", amount: 450 }),
  tx({ _id: "t2", description: "March salary", amount: 55000, type: "income", categoryId: salary, date: "2026-03-01T12:00:00.000Z" }),
];

describe("Expenses", () => {
  beforeEach(() => {
    get.mockReset();
    del.mockReset();
  });

  it("shows a loading message, then the fetched transactions", async () => {
    get.mockResolvedValue({ data });
    renderWithProviders(<Expenses />);
    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
    expect((await screen.findAllByText("Lunch at cafe")).length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith("/transactions");
  });

  it("shows a friendly offline message and recovers on retry", async () => {
    get.mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"));
    get.mockResolvedValueOnce({ data });
    const user = userEvent.setup();
    renderWithProviders(<Expenses />);

    expect(await screen.findByText(/offline or unreachable/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect((await screen.findAllByText("Lunch at cafe")).length).toBeGreaterThan(0);
  });

  it("shows the server's own message for API errors", async () => {
    get.mockRejectedValue(
      new AxiosError("bad", "ERR", undefined, undefined, { status: 400, data: { message: "Bad filter" } } as never)
    );
    renderWithProviders(<Expenses />);
    expect(await screen.findByText("Bad filter")).toBeInTheDocument();
  });

  it("shares one request between components that read the same query", async () => {
    get.mockResolvedValue({ data });
    const { queryClient } = renderWithProviders(<Expenses />);
    await screen.findAllByText("Lunch at cafe");
    expect(queryClient.getQueryData(["transactions"])).toEqual(data);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("asks for confirmation before deleting and refetches afterwards", async () => {
    get.mockResolvedValue({ data });
    del.mockResolvedValue({ data: {} });
    const confirm = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    renderWithProviders(<Expenses />);
    await screen.findAllByText("Lunch at cafe");
    const deleteButtons = screen.getAllByRole("button", { name: /delete|🗑/i });

    confirm.mockReturnValueOnce(false);
    await user.click(deleteButtons[0]);
    expect(del).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    get.mockResolvedValue({ data: [data[1]] });
    await user.click(deleteButtons[0]);
    await waitFor(() => expect(del).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByText("Lunch at cafe")).not.toBeInTheDocument());
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("filters by category", async () => {
    get.mockResolvedValue({ data });
    const user = userEvent.setup();
    renderWithProviders(<Expenses />);
    await screen.findAllByText("Lunch at cafe");

    await user.selectOptions(screen.getByRole("combobox"), "Salary");

    await waitFor(() => expect(screen.queryByText("Lunch at cafe")).not.toBeInTheDocument());
    expect(screen.getAllByText("March salary").length).toBeGreaterThan(0);
  });
});
