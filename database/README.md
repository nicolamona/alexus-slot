# Esquema de vinculación de wallets — Alexus

Este directorio contiene el esquema de base de datos de preparación para el proyecto Alexus.

## Tabla `wallet_links`

- `user_id`: identificador estable del jugador emitido por el backend; es la clave primaria.
- `wallet_address`: dirección pública EVM (42 caracteres, formato `0x` + 40 caracteres hexadecimales); única e insensible a mayúsculas/minúsculas.
- `network`: identificador de red asociado a la dirección (por ejemplo, `world-chain` en un entorno de prueba).
- `created_at`: fecha UTC de creación, generada por SQLite.

## Estado y límites

Este esquema es una plantilla SQLite para desarrollo. El repositorio actual es una Mini App estática: agregar estos archivos **no** provisiona una base de datos, no crea un backend ni conecta la pantalla web con la tabla. Para activarlo más adelante se necesitará un servicio de backend, autenticación real del jugador y configuración de la base de datos.

Modo demo: no hay depósitos, transferencias, lectura de transacciones on-chain ni acreditación de saldos. No guardar frases semilla ni claves privadas. El backend debe obtener `user_id` de la sesión autenticada y no confiar en un ID arbitrario enviado por el cliente.
