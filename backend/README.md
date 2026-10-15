# Alexus wallet-link API (demo only)

This service stores public wallet addresses only. It does not connect to a blockchain, accept deposits, move tokens, or change arcade credits.

## Requirements and local setup

Requires Node.js 20 or newer and a Telegram bot token stored only in the backend environment.

From this directory:

    npm install
    TELEGRAM_BOT_TOKEN='your-real-bot-token' npm test
    TELEGRAM_BOT_TOKEN='your-real-bot-token' npm start

Set ALEXUS_DB_PATH to choose a persistent SQLite file. The default is backend/data/alexus.sqlite; that directory is ignored by Git.

## API

Every /api/* request must send raw Telegram Web App initData in the X-Telegram-Init-Data header. The server verifies Telegram's HMAC signature and freshness, then obtains the player ID from that verified payload. It never trusts a browser-supplied user_id.

- GET /api/wallet — return the authenticated player's address or null.
- PUT /api/wallet — save/update {"address":"0x…","network":"worldchain"}.
- DELETE /api/wallet — unlink the authenticated player's address.
- GET /health — basic health status; no credentials required.

An address can only be linked to one player at a time. Supported network labels are allowlisted; choosing a label does not prove ownership of the address.

## Deployment boundary

The repository frontend is static GitHub Pages. GitHub Pages cannot run this Node server. Deploy the backend separately to a trusted Node hosting service, configure HTTPS and persistent storage, and set TELEGRAM_BOT_TOKEN as a server-side secret. Do not commit the bot token or SQLite database. Configure the frontend API base URL only after the service is deployed.

The Mini App must be opened through Telegram to provide signed initData. A normal browser preview will not authenticate.

This is a development starting point, not a production security audit. Before public use, add operational monitoring, rate limiting, backup/restore, a privacy notice and retention policy, and review the hosting platform's persistent-disk guarantees. No deposits, withdrawals, token transactions, or real-money wagering are implemented.