import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import Dashboard from "./Dashboard";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

describe("Dashboard cold start", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.get).mockReturnValue(new Promise(() => {})); // API still waking up
  });
  afterEach(() => vi.useRealTimers());

  it("explains the wait only after about five seconds", () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/loading financial data/i)).toBeInTheDocument();
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText(/api is waking up/i)).toBeInTheDocument();
  });
});
