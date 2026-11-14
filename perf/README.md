# Load testing

A [k6](https://k6.io) script that puts 50 virtual users on the endpoints behind the dashboard page
(`GET /api/dashboard`, `/api/dashboard/insights`, `/api/budgets/status`) against a user with
50,000 transactions.

## Run it

```bash
# 1. a throwaway database and the API against it
cd backend
export MONGO_URI=mongodb://127.0.0.1:27017/perf JWT_SECRET=perf-secret
npm run seed:perf          # one user, 50,000 transactions over 12 months (only touches that user)
PORT=7100 npm start &

# 2. the test (install k6 from https://grafana.com/docs/k6/latest/set-up/install-k6/)
k6 run -e BASE_URL=http://localhost:7100 perf/dashboard.js
```

Options: `-e VUS=50 -e DURATION=40s`, `PERF_TX=100000 npm run seed:perf`.
Pass criteria (thresholds in the script): zero failed requests, every check passes, dashboard p95 under 2 s.

## Results

Same machine, same data, same script. 2 vCPU / 8 GB sandbox where the API, MongoDB and k6 all share the two
cores, so the absolute numbers are pessimistic. The ratio is what matters. Each row is the average of two
40-second runs at 50 VUs, with a 0.2 s pause between page views.

| | Before | After |
| --- | --- | --- |
| `GET /api/dashboard` p50 | 8.1 s | 1.1 s |
| `GET /api/dashboard` p95 | 9.1 s | 1.5 s |
| Throughput (all dashboard-page requests) | 9.4 req/s | 54 req/s |
| Failed requests | 0% | 0% |

That is roughly 7x lower median latency and 5.7x the throughput.

## What was slow

For one dashboard view the API read the same two months of transactions three times:

1. an aggregation for the income/expense totals,
2. an aggregation plus `$lookup` for the category chart,
3. `generateInsights`, which loaded about 8,000 transactions as Mongoose documents, populated each
   one's category, and summed them in JavaScript. That was the real cost: it holds the Node event loop,
   so every other request queued behind it.

## What changed

`loadMonthStats` in `backend/controllers/dashboard.js` replaces all three with one aggregation. A single
`$match` uses the existing `{ userId, date }` index, then `$facet` splits the result into this month and
last month and groups each by type and category, so MongoDB returns a few dozen small rows. Category names
and icons come from one `find` on only the categories that appear. The recent-transactions list stays a
separate indexed `limit(5)` read, run in parallel, because it spans all time rather than the two-month
window. Budgets and upcoming recurring items use `.lean()`.

The response is unchanged: I compared the old and new controllers on the 50k-transaction dataset and the
summary, recent list, insights and category chart match (only JSON key order differs), and the
existing dashboard tests pin the behaviour.

## Things I tried and left out

- A covering index `{ userId, date, type, categoryId, amount }` made the aggregation only about 15%
  faster (61 to 52 ms) while making every write heavier, so it is not included.
- `GET /api/transactions` is not in the test: with no filters it returns every transaction, and even a
  30-day filter returns thousands of rows (130 MB over a 40 s run). It needs pagination, which is a
  separate change.
