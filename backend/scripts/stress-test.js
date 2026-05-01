import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:7000';
const TOTAL = parseInt(process.env.TOTAL, 10) || 100;
const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signup(email, username, password) {
  const res = await fetch(`${BASE}/api/users/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function getOtp(email) {
  const res = await fetch(`${BASE}/api/users/debug/otp?email=${encodeURIComponent(email)}`);
  const json = await res.json();
  return json.otp;
}

async function verify(email, otp) {
  const res = await fetch(`${BASE}/api/users/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  return { status: res.status, body: await res.text() };
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

async function createTransaction(token) {
  // Fetch available categories and pick an expense category id
  const catsRes = await fetch(`${BASE}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
  const cats = await catsRes.json().catch(() => []);
  const expenseCat = (cats || []).find(c => c.type === 'expense');
  const categoryId = expenseCat?._id;
  const res = await fetch(`${BASE}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: Math.floor(Math.random() * 100) + 1, type: 'expense', categoryId, date: new Date().toISOString(), description: 'stress-test' }),
  });
  return { status: res.status, body: await res.text() };
}

async function simulate(i) {
  const timestamp = Date.now();
  const username = `stress_user_${timestamp}_${i}`;
  const email = `stress_${timestamp}_${i}@example.com`;
  const password = 'Password123!';

  const result = { i, signup: null, otp: null, verify: null, login: null, tx: null, error: null };
  try {
    result.signup = await signup(email, username, password);
    await sleep(200 + Math.random() * 300);
    const otp = await getOtp(email);
    result.otp = otp;
    result.verify = await verify(email, otp);
    await sleep(100 + Math.random() * 200);
    result.login = await login(email, password);
    const token = result.login.body?.token;
    if (!token) {
      result.error = 'No token after login';
      return result;
    }
    result.tx = await createTransaction(token);
  } catch (err) {
    result.error = err.message;
  }
  return result;
}

(async () => {
  console.log(`Stress test starting: total=${TOTAL}, concurrency=${CONCURRENCY}, base=${BASE}`);
  const start = Date.now();
  const results = [];
  for (let offset = 0; offset < TOTAL; offset += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && offset + j < TOTAL; j++) {
      batch.push(simulate(offset + j));
    }
    const batchRes = await Promise.all(batch);
    results.push(...batchRes);
    console.log(`Completed ${Math.min(offset + CONCURRENCY, TOTAL)}/${TOTAL}`);
    await sleep(200); // small pause between batches
  }

  const end = Date.now();
  const summary = {
    total: results.length,
    signup_ok: results.filter(r => r.signup && r.signup.status === 201).length,
    verify_ok: results.filter(r => r.verify && r.verify.status === 200).length,
    login_ok: results.filter(r => r.login && r.login.status === 200).length,
    tx_ok: results.filter(r => r.tx && r.tx.status === 201).length,
    errors: results.filter(r => r.error || (r.signup && r.signup.status >= 400) || (r.verify && r.verify.status >= 400) || (r.login && r.login.status >= 400) || (r.tx && r.tx.status >= 400)).length,
    duration_ms: end - start,
  };

  const out = { summary, results };
  const outPath = path.join(process.cwd(), 'stress-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Stress test finished. Summary:', summary);
  console.log('Results saved to', outPath);
})();
