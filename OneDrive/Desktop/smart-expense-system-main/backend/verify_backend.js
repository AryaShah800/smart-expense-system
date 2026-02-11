// import fetch from 'node-fetch'; // Relying on native fetch in Node 18+
// In native Node, we can just use fetch. But handling cookies needs manual work or a library.
// We'll simulate a simple flow.

const BASE_URL = 'http://localhost:3000/api';
let cookie = '';

const log = (msg, data) => console.log(`\n=== ${msg} ===`, data ? JSON.stringify(data, null, 2) : '');

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  const options = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Extract cookie on auth
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0]; // Simple extraction
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

async function run() {
  try {
    // 1. Signup/Login
    const user = { username: "testuser_" + Date.now(), email: `test_${Date.now()}@example.com`, password: "password123" };
    log('Signing Up', await request('POST', '/auth/signup', user));

    // 2. Create Category
    const category = await request('POST', '/categories', { name: "Food", type: "expense", icon: "burger", color: "red" });
    log('Created Category', category);

    // 3. Create Transaction
    const transaction = await request('POST', '/transactions', {
      amount: 100,
      type: "expense",
      categoryId: category._id,
      description: "Lunch"
    });
    log('Created Transaction', transaction);

    // 4. Set Budget
    const budget = await request('POST', '/budgets', { categoryId: category._id, amount: 500 });
    log('Set Budget', budget);

    // 5. Get Dashboard
    const dashboard = await request('GET', '/dashboard');
    log('Dashboard Data', dashboard);

    // 6. Get Report
    const report = await request('GET', `/reports/monthly?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`);
    log('Monthly Report', report);

  } catch (err) {
    console.error(err);
  }
}

run();
