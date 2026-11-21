# Load testing

A [k6](https://k6.io) script that puts 50 virtual users on the endpoints behind the dashboard page
(`GET /api/dashboard`, `/api/dashboard/insights`, `/api/budgets/status`) against a user with
50,000 transactions.

## Run it

One command reproduces a run (needs Docker, Node and the backend dependencies; images `mongo:7` and
`grafana/k6:0.54.0`):

```bash
perf/run.sh after 1      # starts MongoDB, seeds 50,000 transactions, starts the API, runs k6, cleans up
```

It writes `perf/results/<label>-<n>.json` (k6 `--summary-export`), `.txt` (console summary) and the API log.
The manual steps, if you prefer them:

```bash
cd backend
export MONGO_URI=mongodb://127.0.0.1:27017/perf JWT_SECRET=perf-secret
npm run seed:perf          # one user, 50,000 transactions over 12 months (only touches that user)
PORT=7100 npm start &
k6 run -e BASE_URL=http://localhost:7100 perf/dashboard.js
```

Options: `-e VUS=50 -e DURATION=40s`, `PERF_TX=100000 npm run seed:perf`.
The script's thresholds are: zero failed requests, every check passes, dashboard p95 under 2 s.

## Results

Measured on 2026-11-21 with the raw output committed in [`perf/results/`](results/). 50 VUs, 40 s, 0.2 s
pause between page views, 50,000 transactions, two runs per column (both shown).

Machine: Intel Core i5-13420H (8 cores / 12 threads), 15.7 GB RAM, Windows 11, Docker 29.6.2, Node 22.20.
MongoDB 7 runs in a Docker container, the API runs natively under Node, k6 0.54.0 runs in a Docker container,
so all three compete for the same CPU.

"After" is `main`. "Before" is `main` with only `backend/controllers/dashboard.js` replaced by its version from
`d05011d^` (the commit before the aggregation change, which touched nothing else in the backend), run through
the same script and data:

```bash
git show d05011d^:backend/controllers/dashboard.js > backend/controllers/dashboard.js
perf/run.sh before 1
git checkout backend/controllers/dashboard.js
```

| `GET /api/dashboard` | Before (run 1 / run 2) | After (run 1 / run 2) |
| --- | --- | --- |
| p50 | 13.7 s / 23.0 s | 1.78 s / 1.90 s |
| p95 | 14.8 s / 23.9 s | 3.88 s / 3.08 s |
| Throughput, all dashboard-page requests | 4.0 / 3.3 req/s | 31.2 / 29.6 req/s |
| Failed requests | 0% / 0% | 0% / 0% |

Roughly 8 to 12x lower median latency and about 8x the throughput. Runs vary (the two "before" runs differ
by 70% in the median, because at 3 to 4 req/s only 150 to 200 requests complete), so read this as an order of
magnitude, not a precise ratio.

On this machine the "after" p95 is above the script's 2 s threshold, so k6 exits non-zero for those runs. An
earlier, unreproduced table in this file (p95 9.1 s to 1.5 s, 9.4 to 54 req/s on a 2 vCPU sandbox) was replaced
by the figures above, since only these have raw output in the repo. The `before` runs fail the same threshold.

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
