import { useMemo } from "react";
import { useAppDispatch, useAppSelector, selectUser } from "../store/hooks";
import { loggedIn, loggedOut, refreshUser, userUpdated } from "../store/authSlice";
import type { AuthUser } from "../types/models";

/** Auth state and actions, backed by the Redux auth slice. */
export function useAuth() {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  return useMemo(
    () => ({
      user,
      login: (userData: AuthUser) => dispatch(loggedIn(userData)),
      logout: () => dispatch(loggedOut()),
      updateUser: (userData: Partial<AuthUser>) => dispatch(userUpdated(userData)),
      refreshUser: () => dispatch(refreshUser()),
    }),
    [user, dispatch]
  );
}
