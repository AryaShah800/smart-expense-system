import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "./Navbar";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";
import type { Notification } from "../types";

vi.mock("../api/axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const get = vi.mocked(api.get);
const put = vi.mocked(api.put);

const notifications: Notification[] = [
  { _id: "1", message: "Rahul added WiFi bill", isRead: false, createdAt: "2026-03-01T00:00:00Z" },
  { _id: "2", message: "Old news", isRead: false, createdAt: "2026-02-01T00:00:00Z" },
  { _id: "3", message: "Already seen", isRead: true, createdAt: "2026-01-01T00:00:00Z" },
];

describe("Navbar", () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
  });

  it("shows login and signup links when signed out, without fetching notifications", () => {
    renderWithProviders(<Navbar />, { user: null });
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Signup" })).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("shows the unread count from the notifications query", async () => {
    get.mockResolvedValue({ data: notifications });
    renderWithProviders(<Navbar />);
    expect(await screen.findByText("2")).toHaveClass("notification-badge");
    expect(get).toHaveBeenCalledWith("/users/notifications");
  });

  it("opens the list and marks everything read once", async () => {
    get.mockResolvedValue({ data: notifications });
    put.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderWithProviders(<Navbar />);
    await screen.findByText("2");

    await user.click(screen.getByRole("button", { name: /^notifications/i }));

    expect(await screen.findByText("Rahul added WiFi bill")).toBeInTheDocument();
    await waitFor(() => expect(put).toHaveBeenCalledWith("/users/notifications/read"));
    await waitFor(() => expect(screen.queryByText("2")).not.toBeInTheDocument());

    // Re-opening with nothing unread does not hit the API again.
    await user.click(screen.getByRole("button", { name: /^notifications/i }));
    await user.click(screen.getByRole("button", { name: /^notifications/i }));
    expect(put).toHaveBeenCalledTimes(1);
  });
});
