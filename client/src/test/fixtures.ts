import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import type { ApiError } from "../api/axios";
import type { AuthUser, Notification, Transaction } from "../types/models";

export const user: AuthUser = { _id: "u1", username: "arya", email: "arya@example.com", token: "t", currency: "INR" };

export function notification(id: string, isRead = false): Notification {
  return { _id: id, message: `Notification ${id}`, isRead, createdAt: "2026-11-01T00:00:00.000Z" };
}

export function transaction(id: string, amount = 100): Transaction {
  return { _id: id, userId: "u1", categoryId: null, type: "expense", amount, date: "2026-11-01T00:00:00.000Z", isRecurring: false };
}

/** An Axios error with an HTTP response, as the API would send it. */
export function httpError(status: number, message?: string): AxiosError {
  const response = { status, data: { message }, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse;
  return new AxiosError(message ?? `HTTP ${status}`, "ERR_BAD_RESPONSE", undefined, undefined, response);
}

/** A request that never reached the server, flagged the way the axios interceptor flags it. */
export function serverDownError(): ApiError {
  const error = new AxiosError("Network Error", "ERR_NETWORK") as ApiError;
  error.isServerDown = true;
  return error;
}
