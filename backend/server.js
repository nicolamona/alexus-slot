"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const Database = require("better-sqlite3");

const MAX_AUTH_AGE_SECONDS = 60 * 60;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED_NETWORKS = new Set(["worldchain", "ethereum", "polygon", "arbitrum", "optimism", "base"]);

function verifyTelegramInitData(initData, botToken, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof initData !== "string" || !initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const suppliedHash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  if (!suppliedHash || !/^[a-f0-9]{64}$/i.test(suppliedHash) || !authDateRaw) return null;

  const authDate = Number(authDateRaw);
  if (!Number.isInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const actualHash = Buffer.from(suppliedHash, "hex");
  if (actualHash.length !== expectedHash.length || !crypto.timingSafeEqual(actualHash, expectedHash)) return null;

  try {
    const user = JSON.parse(params.get("user") || "null");
    if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) return null;
    return { id: String(user.id) };
  } catch {
    return null;
  }
}

function createApp(options = {}) {
  const botToken = options.botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is required; never put it in frontend code.");
  const dbPath = options.dbPath ?? process.env.ALEXUS_DB_PATH ?? path.join(__dirname, "data", "alexus.sqlite");
  if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  const db = options.db ?? new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_links (
      user_id TEXT NOT NULL PRIMARY KEY,
      wallet_address TEXT NOT NULL UNIQUE COLLATE NOCASE
        CHECK (
          length(wallet_address) = 42
          AND substr(wallet_address, 1, 2) = '0x'
          AND substr(wallet_address, 3) NOT GLOB '*[^0-9a-fA-F]*'
        ),
      network TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_links_address
      ON wallet_links(wallet_address COLLATE NOCASE);
  `);

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8kb", strict: true }));
  app.get("/health", (_req, res) => res.json({ ok: true, mode: "demo", walletLinking: true, transactions: false }));

  app.use("/api", (req, res, next) => {
    const user = verifyTelegramInitData(req.get("X-Telegram-Init-Data"), botToken);
    if (!user) return res.status(401).json({ error: "Telegram Mini App authentication missing, invalid, or expired." });
    req.telegramUser = user;
    next();
  });

  app.get("/api/wallet", (req, res) => {
    const row = db.prepare("SELECT wallet_address, network, created_at FROM wallet_links WHERE user_id = ?").get(req.telegramUser.id);
    res.json({ wallet: row ? { address: row.wallet_address, network: row.network, createdAt: row.created_at } : null });
  });

  app.put("/api/wallet", (req, res) => {
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
    const network = typeof req.body?.network === "string" ? req.body.network.toLowerCase() : "";
    if (!ADDRESS_RE.test(address)) return res.status(400).json({ error: "Invalid EVM public address." });
    if (!ALLOWED_NETWORKS.has(network)) return res.status(400).json({ error: "Unsupported network." });
    try {
      db.prepare(`
        INSERT INTO wallet_links (user_id, wallet_address, network)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          wallet_address = excluded.wallet_address,
          network = excluded.network,
          created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `).run(req.telegramUser.id, address, network);
      const row = db.prepare("SELECT wallet_address, network, created_at FROM wallet_links WHERE user_id = ?").get(req.telegramUser.id);
      res.json({ wallet: { address: row.wallet_address, network: row.network, createdAt: row.created_at } });
    } catch (error) {
      if (String(error.code || "").startsWith("SQLITE_CONSTRAINT")) {
        return res.status(409).json({ error: "This address is already linked to another account." });
      }
      return res.status(500).json({ error: "Unable to save wallet address." });
    }
  });

  app.delete("/api/wallet", (req, res) => {
    db.prepare("DELETE FROM wallet_links WHERE user_id = ?").run(req.telegramUser.id);
    res.json({ ok: true, wallet: null });
  });
  app.on("close", () => db.close());
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log("Alexus demo wallet API listening on port " + port);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

module.exports = { createApp, verifyTelegramInitData };
