/**
 * Development-only page that throws while rendering, so ErrorBoundary reports
 * a known error to Sentry. Open /sentry-test with `npm run dev` to check the setup.
 */
export default function SentryTest(): never {
  throw new Error("Sentry test error: Smart Expense client (development)");
}
