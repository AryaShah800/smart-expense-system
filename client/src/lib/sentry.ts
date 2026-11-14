import { useEffect } from "react";
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from "react-router-dom";
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

/** True when a DSN is configured; without one, Sentry stays off (local dev, tests). */
export const sentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      // Names transactions by route pattern (/groups/:id), not by each URL.
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    // Sample a fifth of page loads in production to stay inside the free quota.
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // The Express API does not run Sentry, so do not add trace headers to its requests.
    tracePropagationTargets: [],
    // Send no personal or financial data: no auto user info (IP), cookies, headers,
    // query strings or request/response bodies (these hold amounts and the login password).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
}

/** Drop-in replacement for <Routes> that reports parameterised route names. */
export const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

/** Tags events with the user's id only (no email or name). */
export function setSentryUser(userId: string | undefined): void {
  if (!sentryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export function reportError(error: unknown, componentStack?: string): void {
  if (!sentryEnabled) return;
  Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
}

export { Sentry };
