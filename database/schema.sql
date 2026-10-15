-- Alexus: esquema inicial de vinculación de direcciones (SQLite).
-- Preparación de desarrollo únicamente: no crea una base activa ni procesa depósitos.
PRAGMA foreign_keys = ON;

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

-- Nota: user_id debe proceder de la autenticación del backend.
-- Nunca confiar en un user_id enviado libremente desde el navegador.
-- Este esquema no acredita saldos, detecta depósitos ni ejecuta transacciones.
