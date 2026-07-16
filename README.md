# CS Gameshow

Live game show suite for business game nights. Host controls games from an admin dashboard; the audience screen shows the active game on a projector or second monitor.

## Games

- **Friendly Feud** — survey board with reveals, strikes, and scoring
- **Wheel of Riches** — letter board phrase reveal
- **Number Draw** — animated ticket number reveal

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin). Use **Open Audience** for the display window (`/audience`).

Admin and audience sync in the same browser via BroadcastChannel (localStorage fallback).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (`output: 'standalone'` for future desktop packaging)
- `npm run start` — start production server
