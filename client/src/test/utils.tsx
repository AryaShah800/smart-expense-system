import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../api/queryClient";
import { AuthProvider } from "../context/AuthContext";
import type { User } from "../types";

export const testUser: User = {
  _id: "u1",
  username: "Asha Rao",
  email: "asha@example.com",
  currency: "INR",
  theme: "light",
};

interface Options {
  route?: string;
  user?: User | null;
}

/** Renders with router, a fresh query client (no retries) and auth state seeded from `user`. */
export function renderWithProviders(ui: ReactElement, { route = "/", user = testUser }: Options = {}) {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  const queryClient = createQueryClient({ retry: false });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
