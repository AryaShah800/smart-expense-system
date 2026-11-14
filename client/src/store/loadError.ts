import { apiErrorMessage, isServerDown } from "../api/axios";

/** Why a list failed to load; pages turn this into their own wording. */
export interface LoadError {
  serverDown: boolean;
  message: string;
}

export function toLoadError(error: unknown, fallback: string): LoadError {
  return { serverDown: isServerDown(error), message: apiErrorMessage(error, fallback) };
}

export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

export function isLoadError(value: unknown): value is LoadError {
  return typeof value === "object" && value !== null && "serverDown" in value && "message" in value;
}

/** A thunk's LoadError, or a LoadError built from a raw request error. */
export function asLoadError(error: unknown, fallback: string): LoadError {
  return isLoadError(error) ? error : toLoadError(error, fallback);
}

/** The text a page shows for a failed load. */
export function loadErrorText(error: LoadError | null, offlineText: string): string {
  if (!error) return "";
  return error.serverDown ? offlineText : error.message;
}
