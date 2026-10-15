# Esquema de vinculación de wallets — Alexus

El backend de desarrollo está en [backend/](../tree/main/backend). Al iniciarse, crea automáticamente la base SQLite en `backend/data/alexus.sqlite` (o en la ruta configurada por `ALEXUS_DB_PATH`). El archivo de base de datos local está excluido de Git para evitar publicar datos de usuarios.

## Tabla `wallet_links`

- `user_id`: identificador estable del jugador obtenido de la carga de Telegram validada por el backend.
- `wallet_address`: dirección pública EVM de 42 caracteres; única e insensible a mayúsculas/minúsculas.
- `network`: identificador de red permitido por el backend, por ejemplo `worldchain`.
- `created_at`: fecha UTC generada por SQLite.

El esquema activo se inicializa desde `backend/server.js`; `schema.sql` sigue siendo una plantilla legible para inspección y herramientas de desarrollo.

## Estado y límites

El código del backend y las pruebas están en el repositorio, pero la API aún debe instalarse y ejecutarse en un entorno de desarrollo para que se cree el archivo SQLite real. La Mini App usa el backend solo cuando se configura la URL en la etiqueta `meta[name="alexus-api-base"]`; si está vacía, el formulario continúa guardando localmente en modo demo.

La API verifica la firma y antigüedad de Telegram Mini App `initData`; no acepta un `user_id` arbitrario enviado por el navegador. La API solo guarda, consulta y desvincula direcciones públicas. No realiza depósitos, retiros, transferencias, lecturas on-chain ni acreditación de saldos. Nunca guardar frases semilla ni claves privadas.
