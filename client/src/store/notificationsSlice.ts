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

let liveCounter = 0;

/**
 * Socket payloads are not typed at runtime. Keep only ones with a text message, and fill in what the server
 * does not send for live events: an id (so list rows keep a stable key when new items are added on top) and
 * a valid timestamp (otherwise the list shows "Invalid Date").
 */
export function toNotification(raw: unknown): Notification | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<Record<keyof Notification, unknown>>;
  if (typeof value.message !== "string" || !value.message.trim()) return null;
  const createdAt = typeof value.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt))
    ? value.createdAt
    : new Date().toISOString();
  return {
    _id: typeof value._id === "string" && value._id ? value._id : `live-${Date.now()}-${++liveCounter}`,
    message: value.message,
    isRead: value.isRead === true,
    createdAt,
  };
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /** A real-time notification pushed over the socket. */
    notificationReceived: {
      reducer(state, action: PayloadAction<Notification | null>) {
        if (action.payload) state.items.unshift(action.payload);
      },
      prepare(raw: unknown) {
        return { payload: toNotification(raw) };
      },
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
