// k6 load test: 50 virtual users hitting the endpoints behind the dashboard page.
//
//   k6 run -e BASE_URL=http://localhost:7100 perf/dashboard.js
//
// Needs the heavy perf user: `npm run seed:perf` in backend/. See perf/README.md.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:7000";
const EMAIL = __ENV.PERF_EMAIL || "perf@smartexpense.test";
const PASSWORD = __ENV.PERF_PASSWORD || "Perf@12345";
const VUS = Number(__ENV.VUS) || 50;
const DURATION = __ENV.DURATION || "40s";

export const options = {
  scenarios: {
    dashboard: { executor: "constant-vus", vus: VUS, duration: DURATION, gracefulStop: "10s" },
  },
  thresholds: {
    http_req_failed: ["rate==0"], // not a single error at 50 VUs
    checks: ["rate==1"],
    "http_req_duration{endpoint:dashboard}": ["p(95)<2000"],
  },
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
};

// Log in once; every VU reuses the session token (the API also accepts it as a Bearer header).
export function setup() {
  const res = http.post(`${BASE}/api/users/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  if (res.status !== 200 || !res.cookies.jwt) {
    throw new Error(`login failed (${res.status}): run "npm run seed:perf" first. ${res.body}`);
  }
  return { token: res.cookies.jwt[0].value };
}

export default function (data) {
  const params = (endpoint) => ({
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { endpoint },
  });

  // One page view = the dashboard plus the other dashboard-page reads, one after another.
  const responses = [
    http.get(`${BASE}/api/dashboard`, params("dashboard")),
    http.get(`${BASE}/api/dashboard/insights`, params("insights")),
    http.get(`${BASE}/api/budgets/status`, params("budget_status")),
  ];
  for (const r of responses) check(r, { "status is 200": (x) => x.status === 200 });
  check(responses[0], { "dashboard has a summary": (x) => x.json("summary.totalExpense") !== undefined });

  sleep(0.2);
}
