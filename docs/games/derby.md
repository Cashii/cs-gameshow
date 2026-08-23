# Derby

Operator-rigged four-car race. The operator picks the winner; the spectator screen plays a 20-second race that always ends with that car crossing first.

Player betting and win certificates are not in this version. Each race still gets a `raceId` so those can attach later.

## Operator

1. Select **Derby** in the left nav.
2. Put **Derby** on the Spectator screen dropdown so the projector shows the track.
3. Pick the winning color (Red, Blue, Green, Yellow). The audience does not see this pick.
4. Click **Start race**. Cars jockey for 20 seconds, then the chosen car hits the finish line.
5. **Reset** returns the track to the starting line.

Starting again (same winner or a new one) uses a new seed, so lead changes look different.

## Spectator

- **Idle:** four cars on the starting line, no winner callout.
- **Racing:** time-synced from `startedAt`. A late-joining projector catches up mid-pack.
- **Finished:** winner banner. Reduced-motion clients jump to this state.

The spectator does not stream car positions. Every screen derives progress from the shared start time, duration, winner, and seed.
