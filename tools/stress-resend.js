// Simple stress tester for POST /api/users/resend-otp
// Usage: node tools/stress-resend.js

const TARGET = process.env.TARGET_URL || 'http://localhost:7000/api/users/resend-otp';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '20', 10);
const TOTAL = parseInt(process.env.TOTAL || '100', 10);
const EMAIL = process.env.EMAIL || 'loadtest@example.invalid';

console.log(`Target: ${TARGET}`);
console.log(`Concurrency: ${CONCURRENCY}, Total requests: ${TOTAL}, Email: ${EMAIL}`);

const fetch = global.fetch || require('node-fetch');

async function doRequest(i) {
  const start = Date.now();
  try {
    const res = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    const text = await res.text();
    const duration = Date.now() - start;
    return { ok: res.ok, status: res.status, duration, body: text };
  } catch (err) {
    const duration = Date.now() - start;
    return { ok: false, error: err.message, duration };
  }
}

(async () => {
  let completed = 0;
  let successes = 0;
  let failures = 0;
  const latencies = [];

  const queue = [];
  for (let i = 0; i < TOTAL; i++) {
    queue.push(i);
  }

  async function worker(id) {
    while (queue.length) {
      const i = queue.shift();
      if (i === undefined) break;
      const res = await doRequest(i);
      completed++;
      if (res.ok) successes++; else failures++;
      latencies.push(res.duration || 0);
      if (completed % Math.max(1, Math.floor(TOTAL/10)) === 0) {
        console.log(`Progress: ${completed}/${TOTAL} (s:${successes}, f:${failures})`);
      }
    }
  }

  const workers = [];
  const startAll = Date.now();
  for (let w = 0; w < CONCURRENCY; w++) workers.push(worker(w));
  await Promise.all(workers);
  const totalTime = Date.now() - startAll;

  latencies.sort((a,b)=>a-b);
  const p50 = latencies[Math.floor(latencies.length*0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length*0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length*0.99)] || 0;

  console.log('--- Summary ---');
  console.log(`Completed: ${completed}`);
  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);
  console.log(`Total time: ${totalTime} ms`);
  console.log(`p50: ${p50} ms, p95: ${p95} ms, p99: ${p99} ms`);
})();
