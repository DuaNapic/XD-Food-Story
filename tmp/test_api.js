// Node 18+ has global fetch
async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/recommend/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '你好', conversation_history: [] })
    });
    console.log('Status:', res.status);
    console.log('OK:', res.ok);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

test();
