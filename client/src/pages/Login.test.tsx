import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { AxiosError } from "axios";
import Login from "./Login";
import api from "../api/axios";
import { renderWithProviders, testUser } from "../test/utils";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { post: vi.fn(), get: vi.fn() } };
});
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const post = vi.mocked(api.post);

function renderLogin(user = null as typeof testUser | null) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<p>Dashboard page</p>} />
    </Routes>,
    { route: "/login", user }
  );
}

describe("Login", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("signs in, stores the profile without any token, and goes to the dashboard", async () => {
    post.mockResolvedValue({ data: { ...testUser, token: "should-never-be-stored" } });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "asha@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Secret@123");
    await user.click(screen.getByRole("button", { name: /log ?in|sign ?in/i }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/users/login", { email: "asha@example.com", password: "Secret@123" });
    const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
    expect(stored.email).toBe("asha@example.com");
    expect(stored).not.toHaveProperty("token");
  });

  it("stays on the page and shows the server's message when login fails", async () => {
    post.mockRejectedValue(
      new AxiosError("bad", "ERR", undefined, undefined, { status: 401, data: { message: "Invalid credentials" } } as never)
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), "asha@example.com");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log ?in|sign ?in/i }));

    await waitFor(() => expect(screen.getByText("Invalid credentials")).toBeInTheDocument());
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("redirects an already signed-in user away from the login page", () => {
    renderLogin(testUser);
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});
