import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../api/axios";
import type { AuthUser, User } from "../types/models";

export const USER_STORAGE_KEY = "user";

export interface AuthState {
  user: AuthUser | null;
}

export function readStoredUser(): AuthUser | null {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Fetches the latest profile; older endpoints wrapped it as `{ success, user }`. */
export const refreshUser = createAsyncThunk("auth/refreshUser", async () => {
  const { data } = await api.get<User | { success?: boolean; user?: User }>("/users/me");
  if ("_id" in data && data._id) return data;
  if ("user" in data && data.success && data.user) return data.user;
  return null;
});

/**
 * Background session check after a page load. Only a 401 ends the session:
 * network errors and timeouts (e.g. a Render cold start) keep the user signed in.
 */
export const verifySession = createAsyncThunk("auth/verifySession", async (_, { dispatch }) => {
  try {
    await api.get("/users/me");
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      dispatch(loggedOut());
    }
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: (): AuthState => ({ user: readStoredUser() }),
  reducers: {
    loggedIn(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.user = null;
    },
    userUpdated(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) Object.assign(state.user, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(refreshUser.fulfilled, (state, action) => {
      if (state.user && action.payload) Object.assign(state.user, action.payload);
    });
  },
});

export const { loggedIn, loggedOut, userUpdated } = authSlice.actions;
export default authSlice.reducer;
