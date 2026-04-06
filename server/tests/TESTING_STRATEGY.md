# Testing strategy — Leave Management API

## Layers

1. **Unit tests** (`tests/unit/`)
   - Pure helpers: email templates, date math, realtime fan-out (mocked `Server`).
   - Fast, no MySQL or SMTP required; run in CI on every commit.

2. **Integration tests** (`tests/integration/`)
   - HTTP surface with **Supertest** against the Express `app` (no listening port).
   - Covers validation middleware, auth middleware (401 without JWT), and health checks.
   - Does **not** require a database for the current suite.

3. **End-to-end / DB-backed tests** (recommended next step)
   - Spin MySQL (Docker) + run `db/schema.sql` + `npm run seed`.
   - Test overlapping leave, insufficient balance, and wrong mentor with real transactions.
   - Use a dedicated `leavemanage_test` database and truncate between tests.

4. **Socket.io**
   - Handshake requires JWT (`auth.token`, `query.token`, or `Authorization: Bearer`).
   - Manual or automated test: connect `socket.io-client` with a valid token and assert `socket:ready`, then trigger a leave apply in another client and assert `leave_applied` on the mentor socket.

5. **Email**
   - With SMTP unset, Nodemailer paths log `skipped` in `notification_log` (no flaky network in CI).
   - With a dev mailbox (Mailhog, Ethereal), assert message shape using E2E tests.

## Performance & scale

- **HTTP**: keep pool size (`DB_POOL_SIZE`) aligned with worker count; use read replicas later for reporting only.
- **Socket.io**: single Node instance uses in-memory adapter; for multiple API instances add **Redis adapter** (`@socket.io/redis-adapter`) so `user:{id}` rooms work across processes.
- **Queries**: leave overlap and mentor inbox queries use composite indexes (see `db/schema` / migration).

## Commands

```bash
npm run test
npm run lint
```
