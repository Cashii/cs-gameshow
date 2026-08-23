# CS Gameshow

Live game show suite for business game nights. The operator controls games from a dashboard; the spectator screen shows the active game on a projector; hostesses and players join from their phones on the same network.

See **[docs/README.md](docs/README.md)** for full documentation.

## Screens

| Screen | Route |
|--------|-------|
| Operator | [/operator](http://localhost:3000/operator) |
| Spectator | [/spectator](http://localhost:3000/spectator) |
| Hostess | [/hostess](http://localhost:3000/hostess) |
| Player | [/player](http://localhost:3000/player) |

## Games

- **Friendly Feud** — survey board with reveals, strikes, and scoring
- **Wheel of Riches** — letter board phrase reveal
- **Live Drawer** — colored token pool with multi-number draws
- **Take It or Leave It** — 9 cases, banker offers, take it or leave it

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set MONGODB_URI and SESSION_SECRET
npm run dev
```

Open [http://localhost:3000/operator](http://localhost:3000/operator). Default operator PIN is `1234` on first run.

Screens stay in sync over **SSE** (Server-Sent Events) backed by MongoDB (`gameshow_dev` database).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (`output: 'standalone'` for future desktop packaging)
- `npm run start` — start production server
