"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createApp } = require("./server");

const BOT_TOKEN = "123456:TEST_ONLY_TOKEN";
const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";

function signedInitData(userId) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "test-query",
    user: JSON.stringify({ id: userId, first_name: "Demo" })
  });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", crypto.createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

test("player can save, read, and unlink; players remain isolated", async (t) => {
  const app = createApp({ botToken: BOT_TOKEN, dbPath: ":memory:" });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise(resolve => server.close(resolve)));
  t.after(() => app.emit("close"));
  await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const headersA = { "content-type": "application/json", "X-Telegram-Init-Data": signedInitData(1001) };
  const headersB = { "content-type": "application/json", "X-Telegram-Init-Data": signedInitData(1002) };

  let response = await fetch(base + "/api/wallet", { headers: headersA });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).wallet, null);

  response = await fetch(base + "/api/wallet", { method: "PUT", headers: headersA,
    body: JSON.stringify({ address: ADDRESS_A, network: "worldchain" }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).wallet.address, ADDRESS_A);

  response = await fetch(base + "/api/wallet", { headers: headersA });
  assert.equal((await response.json()).wallet.network, "worldchain");

  response = await fetch(base + "/api/wallet", { method: "PUT", headers: headersB,
    body: JSON.stringify({ address: ADDRESS_B, network: "worldchain" }) });
  assert.equal(response.status, 200);
  response = await fetch(base + "/api/wallet", { headers: headersB });
  assert.equal((await response.json()).wallet.address, ADDRESS_B);

  response = await fetch(base + "/api/wallet", { method: "DELETE", headers: headersA });
  assert.equal(response.status, 200);
  response = await fetch(base + "/api/wallet", { headers: headersA });
  assert.equal((await response.json()).wallet, null);
  response = await fetch(base + "/api/wallet", { headers: headersB });
  assert.equal((await response.json()).wallet.address, ADDRESS_B);
});

test("rejects missing authentication and invalid addresses", async (t) => {
  const app = createApp({ botToken: BOT_TOKEN, dbPath: ":memory:" });
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise(resolve => server.close(resolve)));
  t.after(() => app.emit("close"));
  await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;

  let response = await fetch(base + "/api/wallet");
  assert.equal(response.status, 401);
  response = await fetch(base + "/api/wallet", { method: "PUT",
    headers: { "content-type": "application/json", "X-Telegram-Init-Data": signedInitData(1003) },
    body: JSON.stringify({ address: "not-a-wallet", network: "worldchain" }) });
  assert.equal(response.status, 400);
});