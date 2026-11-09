import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import api from "../api/axios";

vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const profile = { _id: "u1", username: "Asha", email: "asha@example.com", currency: "INR", theme: "light" };

describe("AuthContext", () => {
  it("starts signed out when nothing is stored", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
  });

  it("restores the stored user and drops a token saved by older versions", () => {
    localStorage.setItem("user", JSON.stringify({ ...profile, token: "old.jwt" }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toEqual(profile);
    expect(JSON.parse(localStorage.getItem("user")!)).not.toHaveProperty("token");
  });

  it("login stores the profile without a token", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login({ ...profile, token: "secret" }));
    expect(result.current.user).toEqual(profile);
    expect(localStorage.getItem("user")).not.toContain("secret");
  });

  it("logout clears state and storage", () => {
    localStorage.setItem("user", JSON.stringify(profile));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("applies the user's theme to the document", () => {
    localStorage.setItem("user", JSON.stringify({ ...profile, theme: "dark" }));
    renderHook(() => useAuth(), { wrapper });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("refreshUser merges either response shape from /users/me", async () => {
    localStorage.setItem("user", JSON.stringify(profile));
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(api.get).mockResolvedValueOnce({ data: { ...profile, currency: "USD" } });
    await act(() => result.current.refreshUser());
    expect(result.current.user?.currency).toBe("USD");

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, user: { ...profile, currency: "EUR" } } });
    await act(() => result.current.refreshUser());
    expect(result.current.user?.currency).toBe("EUR");
  });

  it("throws a clear error when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
