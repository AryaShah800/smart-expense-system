import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "../api/queryClient";
import { makeStore, type RootState } from "../store";
import { user } from "./fixtures";

/** Renders UI with a fresh Redux store, a retry-free query client and a router. */
export function renderWithProviders(
  ui: ReactNode,
  {
    preloadedState = { auth: { user } } as Partial<RootState>,
    queryClient = createQueryClient({ retry: false }),
    route = "/",
  }: { preloadedState?: Partial<RootState>; queryClient?: QueryClient; route?: string } = {}
) {
  const store = makeStore(preloadedState);
  const result = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
  return { ...result, store, queryClient };
}
