# CS Gameshow Documentation

Live game show suite for business game nights. One operator runs games from a laptop; a projector shows the spectator screen; hostesses and players join from their phones on the same network.

## Screens

| Screen | Route | Access |
|--------|-------|--------|
| [Operator](screens.md#operator) | `/operator` | PIN |
| [Spectator](screens.md#spectator) | `/spectator` | Open |
| [Hostess](screens.md#hostess) | `/hostess` | PIN |
| [Player](screens.md#player) | `/player` | Open |

Legacy routes `/admin` and `/audience` redirect to `/operator` and `/spectator`.

## Games

- [Friendly Feud](games/friendly-feud.md)
- [Wheel of Riches](games/wheel-of-riches.md)
- [Live Drawer](games/live-drawer.md)
- [Take It or Leave It](games/take-it-or-leave-it.md)
- [Message Board](games/message-board.md)

## Setup

```bash
npm install
cp .env.example .env.local
# Set MONGODB_URI and SESSION_SECRET in .env.local
npm run dev
```

Open [http://localhost:3000/operator](http://localhost:3000/operator). Default operator PIN is `1234` on first run (change it in Settings).

## More

- [Glossary](glossary.md)
- [Architecture](architecture.md)
