import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/axios";
import type { Group } from "../types/models";
import { loggedOut } from "./authSlice";
import { toLoadError, type LoadError, type LoadStatus } from "./loadError";

export interface GroupsState {
  items: Group[];
  status: LoadStatus;
  error: LoadError | null;
}

export const fetchGroups = createAsyncThunk<Group[], void, { rejectValue: LoadError }>(
  "groups/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Group[]>("/groups");
      return data;
    } catch (error) {
      return rejectWithValue(toLoadError(error, "Failed to load groups."));
    }
  }
);

const initialState: GroupsState = { items: [], status: "idle", error: null };

const groupsSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? { serverDown: false, message: "Failed to load groups." };
      })
      .addCase(loggedOut, () => initialState);
  },
});

export default groupsSlice.reducer;
