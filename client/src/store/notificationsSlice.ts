import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import api from "../api/axios";
import type { Notification } from "../types/models";
import { loggedOut } from "./authSlice";

export interface NotificationsState {
  items: Notification[];
}

export const fetchNotifications = createAsyncThunk("notifications/fetch", async () => {
  const { data } = await api.get<Notification[]>("/users/notifications");
  return data;
});

export const markAllRead = createAsyncThunk("notifications/markAllRead", async () => {
  await api.put("/users/notifications/read");
});

const initialState: NotificationsState = { items: [] };

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /** A real-time notification pushed over the socket. */
    notificationReceived(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(markAllRead.fulfilled, (state) => {
        for (const item of state.items) item.isRead = true;
      })
      .addCase(loggedOut, () => initialState);
  },
});

export const { notificationReceived } = notificationsSlice.actions;
export default notificationsSlice.reducer;
