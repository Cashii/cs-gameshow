# Derby

Operator-rigged four-racer race. The operator picks the winner; the spectator screen plays a 20-second race that always ends with that racer crossing first.

Two visual themes share the same race math:

- **Wonderbar's Dildo Derby** — disco track with wiggling dildos in mixed shapes (default)
- **Kentucky Derby** — carnival horse race

Player betting and win certificates are not in this version. Each race still gets a `raceId` so those can attach later.

## Operator

1. Select **Derby** in the left nav.
2. Put **Derby** on the Spectator screen so the projector shows the track.
3. Choose a **Theme**. The pick syncs to the spectator display immediately.
4. Set **Horse size** / **Toy size** if the projector sprites need to be larger or smaller. Reset keeps this scale.
5. Pick the winning color. The audience does not see this pick.
6. Click **Start race**. Racers run for 20 seconds, then the chosen one hits the finish line.
7. **Reset** returns racers to the starting line and keeps the current theme and size.

Starting again (same winner or a new one) uses a new seed, so lead changes look different.

## Spectator

- **Idle:** four racers on the starting line, no winner callout.
- **Racing:** time-synced from `startedAt`. A late-joining projector catches up mid-pack. Horses gallop; Wonderbar toys wiggle.
- **Finished:** winner banner. Wonderbar winner sprays from the tip. Reduced-motion clients jump to this state.

The spectator does not stream racer positions. Every screen derives progress from the shared start time, duration, winner, and seed.
