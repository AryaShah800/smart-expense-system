import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import Signup from "./Signup";
import api from "../api/axios";
import { renderWithProviders, testUser } from "../test/utils";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { post: vi.fn(), get: vi.fn() } };
});
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const post = vi.mocked(api.post);

function renderSignup() {
  return renderWithProviders(
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<p>Dashboard page</p>} />
    </Routes>,
    { route: "/signup", user: null }
  );
}

async function fillAccountForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/username/i), "asha");
  await user.type(screen.getByLabelText(/email/i), "asha@example.com");
  await user.type(screen.getByLabelText(/^password/i), "Secret@123");
}

describe("Signup", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("creates the account, then asks for the emailed verification code", async () => {
    post.mockResolvedValue({ data: { message: "OTP sent" } });
    const user = userEvent.setup();
    renderSignup();

    await fillAccountForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/verification code/i)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/users/signup", {
      username: "asha",
      email: "asha@example.com",
      password: "Secret@123",
    });
  });

  it("signs the user in after a correct code and never stores a token", async () => {
    post.mockResolvedValueOnce({ data: { message: "OTP sent" } });
    post.mockResolvedValueOnce({ data: { ...testUser, token: "nope" } });
    const user = userEvent.setup();
    renderSignup();

    await fillAccountForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await user.type(await screen.findByPlaceholderText("• • • • • •"), "123456");
    await user.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(post).toHaveBeenLastCalledWith("/users/verify-otp", { email: "asha@example.com", otp: "123456" });
    expect(JSON.parse(localStorage.getItem("user") ?? "{}")).not.toHaveProperty("token");
  });
});
