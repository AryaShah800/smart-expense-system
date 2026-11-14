import { QueryClient } from "@tanstack/react-query";

/** Central place for query defaults, so tests can build an identical client with retries off. */
export function createQueryClient(overrides: { retry?: boolean | number } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: overrides.retry ?? 1,
      },
    },
  });
}

export const queryClient = createQueryClient();

/** Query keys in one place so mutations and socket events invalidate the right data. */
export const queryKeys = {
  transactions: ["transactions"] as const,
  categories: ["categories"] as const,
  budgets: ["budgets"] as const,
  budgetStatus: ["budgets", "status"] as const,
  insights: ["insights"] as const,
  recurring: ["recurring"] as const,
  groups: ["groups"] as const,
  group: (id: string) => ["group", id] as const,
  groupCategories: (id: string) => ["group", id, "categories"] as const,
  invitations: ["invitations"] as const,
};

/**
 * Drops every cached query when the signed-in user changes (logout, 401, or a
 * different account), so one user's data is never shown to the next.
 */
export function clearCacheOnUserChange(
  store: { getState: () => { auth: { user: { _id: string } | null } }; subscribe: (listener: () => void) => () => void },
  client: QueryClient = queryClient
): () => void {
  let lastUserId = store.getState().auth.user?._id ?? null;
  return store.subscribe(() => {
    const userId = store.getState().auth.user?._id ?? null;
    if (userId === lastUserId) return;
    lastUserId = userId;
    client.clear();
  });
}
