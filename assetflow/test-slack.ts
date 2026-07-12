const URL = "http://localhost:3000/api/slack-alert";

async function runTests() {
  console.log("🧪 Starting Slack Alert & Redis Rate Limiter Tests...\n");

  // --- NORMAL CASES ---
  console.log("🔹 Normal Case 1: Send a basic HIGH priority alert");
  const res1 = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Case 1",
      message: "This is a normal high priority test.",
      priority: "HIGH"
    })
  });
  console.log(`Status: ${res1.status} | Output: ${await res1.text()}`);

  console.log("\n🔹 Normal Case 2: Send a basic INFO priority alert");
  const res2 = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Test Case 2",
      message: "This is a normal info priority test.",
      priority: "INFO"
    })
  });
  console.log(`Status: ${res2.status} | Output: ${await res2.text()}`);

  // --- EDGE CASES ---
  console.log("\n⚠️ Edge Case 1: Missing required fields (No title)");
  const res3 = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "This should fail with 400 Bad Request because there is no title.",
      priority: "CRITICAL"
    })
  });
  console.log(`Status: ${res3.status} | Output: ${await res3.text()}`);

  console.log("\n⚠️ Edge Case 2: Redis Rate Limit Exceeded (Sending 5 rapid requests...)");
  // The limit is 5 per minute. We already sent 2 (Normal 1 & 2). 
  // Let's send 4 more. The 4th one should hit the limit (since 2+4 = 6 > 5 limit).
  for (let i = 1; i <= 4; i++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Spam Request ${i}`,
        message: "Triggering rate limit",
        priority: "INFO"
      })
    });
    console.log(`Spam ${i} Status: ${res.status} | Body: ${await res.text()}`);
  }

  console.log("\n🧪 Tests Complete!");
  process.exit(0);
}

runTests();
