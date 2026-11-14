import { combineReducers, configureStore } from "@reduxjs/toolkit";
import auth, { USER_STORAGE_KEY } from "./authSlice";
import notifications from "./notificationsSlice";

// Redux holds the session and the socket-fed notifications; server data
// (transactions, groups, budgets, recurring) lives in TanStack Query.
const rootReducer = combineReducers({ auth, notifications });

export type RootState = ReturnType<typeof rootReducer>;

/** Builds a store; tests call this to get a fresh one. */
export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({ reducer: rootReducer, preloadedState });

  // Keep the signed-in user in localStorage so a reload stays signed in.
  let lastUser = store.getState().auth.user;
  store.subscribe(() => {
    const { user } = store.getState().auth;
    if (user === lastUser) return;
    lastUser = user;
    try {
      if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Storage can be blocked (private mode); the in-memory session still works.
    }
  });

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];

export const store = makeStore();
