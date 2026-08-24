# Architecture

## Stack

- **Next.js 16** App Router (React 19)
- **MongoDB** — event state, tokens, votes
- **SSE** — real-time push to all connected screens
- **Signed cookies** — role sessions after PIN login

## Database

Always use the dedicated database **`gameshow_dev`**. Never use Mongo's default `test` database.

Set in `.env.local`:

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=gameshow_dev
SESSION_SECRET=<random-32+-char-string>
```

The client opens `client.db(process.env.MONGODB_DB ?? "gameshow_dev")` explicitly.

## Collections

| Collection | Purpose |
|------------|---------|
| `events` | Single active event: suite game states, poll, revision, PIN hashes |
| `tokens` | Live Drawer pool tokens `{ eventId, number, colorId, status, drawBatchId }` |
| `drawBatches` | History of drawn token sets |
| `votes` | Player poll votes `{ pollId, deviceId, choiceId }` — unique per `(pollId, deviceId)` |
| `triviaVotes` | Elimination Trivia answers `{ eventId, roundId, deviceId, choiceId, playerCode }` — unique per `(eventId, roundId, deviceId)` |
| `triviaPlayers` | Elimination Trivia roster `{ eventId, deviceId, playerCode, status, joinedRound, eliminatedRound }` |

Unique index on `tokens`: `(eventId, number, colorId)`.

## Real-time sync

1. Client opens `GET /api/event/stream` (SSE).
2. Mutations go through POST/PATCH API routes → Mongo write → bump `revision` → in-process pub/sub pushes to all SSE connections.
3. Fallback: short-poll `GET /api/event?since=<revision>` every 1s if EventSource fails.

Expected deployment: one Next.js process on the event LAN.

## Auth

| Role | Can write |
|------|-----------|
| operator | Full suite, tokens, draws, polls, PINs |
| hostess | Add tokens only |
| player | Vote on open polls and Elimination Trivia questions (no PIN; identified by device ID) |
| spectator | Read-only (no session required) |

## Player uniqueness (100+ phones)

Players do not use a PIN. Each phone is tracked separately:

1. **Device ID** — On first visit to `/player`, the browser stores a random UUID in `localStorage`.
2. **MongoDB unique index** — `(pollId, deviceId)` allows exactly one vote per phone per poll. Elimination Trivia uses `(eventId, roundId, deviceId)` on `triviaVotes` the same way.

100 phones = 100 device IDs = 100 independent votes. Re-opening the player page on the same phone shows "Vote recorded" (poll) or "answer locked" (trivia) instead of allowing a second vote.

The player screen is poll and Elimination Trivia. Other games do not have a player board.

PINs stored as SHA-256 hashes on the event document. Session cookie: HMAC-signed payload with role.

## API routes

- `GET /api/event` — snapshot (204 if `since` matches revision)
- `GET /api/event/stream` — SSE stream
- `PATCH /api/event` — operator suite updates
- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/session`
- `POST /api/tokens` — add token(s)
- `DELETE /api/tokens/[id]` — remove pool token
- `DELETE /api/tokens` — operator: delete every remaining pool token
- `POST /api/live-drawer/draw` — random or specific draw
- `POST /api/live-drawer/clear` — hide spectator reveal
- `POST /api/live-drawer/undo` — return last batch to pool
- `POST /api/poll` — operator poll control
- `POST /api/poll/vote` — player vote
- `POST /api/trivia` — player vote (`action: vote`) or operator Elimination Trivia control (`setup`, `open`, `lock`, `reveal`, `undoReveal`, `nextQuestion`, `resetSeries`)
- `GET /api/trivia/me` — player personal status (`?deviceId=`)
- `GET /api/trivia/roster` — operator remaining player codes
