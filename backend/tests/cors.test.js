import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../config/cors.js";

test("allows non-browser requests and local development", () => {
  assert.equal(isAllowedOrigin(undefined, {}), true);
  assert.equal(isAllowedOrigin("http://localhost:5173", {}), true);
});

test("with ALLOWED_ORIGINS set, only those exact origins pass", () => {
  const env = { ALLOWED_ORIGINS: "https://smart-expense.vercel.app, https://app.example.com/" };
  assert.equal(isAllowedOrigin("https://smart-expense.vercel.app", env), true);
  assert.equal(isAllowedOrigin("https://app.example.com", env), true);
  assert.equal(isAllowedOrigin("https://evil.vercel.app", env), false);
  assert.equal(isAllowedOrigin("https://smart-expense.vercel.app.evil.com", env), false);
});

test("without ALLOWED_ORIGINS, falls back to *.vercel.app for existing deploys", () => {
  assert.equal(isAllowedOrigin("https://anything.vercel.app", {}), true);
  assert.equal(isAllowedOrigin("https://evil.com", {}), false);
});
