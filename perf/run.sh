#!/usr/bin/env bash
# Reproduce one perf run. Usage: perf/run.sh <label> [run-number]
# Needs: Docker (MongoDB + grafana/k6 images), Node, backend deps installed.
# Writes perf/results/<label>-<run>.json (k6 --summary-export) and .txt (k6 console summary).
set -euo pipefail
LABEL=${1:?label}; RUN=${2:-1}; PORT=${PORT:-7100}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
docker rm -f perf-mongo >/dev/null 2>&1 || true
docker run -d --name perf-mongo -p 27017:27017 mongo:7 >/dev/null
trap 'kill ${API_PID:-0} 2>/dev/null || true; docker rm -f perf-mongo >/dev/null 2>&1 || true' EXIT
sleep 6
cd "$ROOT/backend"
export MONGO_URI=mongodb://127.0.0.1:27017/perf JWT_SECRET=perf-secret PERF_TX=${PERF_TX:-50000}
npm run seed:perf
PORT=$PORT node index.js >"$ROOT/perf/results/$LABEL-$RUN.api.log" 2>&1 &
API_PID=$!
sleep 6
cd "$ROOT"
MSYS_NO_PATHCONV=1 docker run --rm -v "$ROOT/perf:/perf" grafana/k6:0.54.0 run \
  -e BASE_URL=http://host.docker.internal:$PORT -e VUS=${VUS:-50} -e DURATION=${DURATION:-40s} \
  --summary-export=/perf/results/$LABEL-$RUN.json /perf/dashboard.js | tee "perf/results/$LABEL-$RUN.txt"
