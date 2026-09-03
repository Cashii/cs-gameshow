# Derby

Operator-rigged four-racer race. The operator picks the winner; the spectator screen plays a 20-second race that always ends with that racer crossing first.

Two visual themes share the same race math:

- **Wonderbar's Dildo Derby** — disco track with wiggling dildos in mixed shapes (default)
- **Kentucky Derby** — carnival horse race

While the race is idle, phones on `/player` can pick a toy or horse. Vote tallies show on the operator panel. Voting locks when the race starts. Win certificates are not in this version.

## Operator

1. Select **Derby** in the left nav.
2. Put **Derby** on the Spectator screen so the projector shows the track (phones follow that screen for voting).
3. Choose a **Theme**. The pick syncs to the spectator display immediately.
4. Set **Horse size** / **Toy size** if the projector sprites need to be larger or smaller. Reset keeps this scale.
5. Watch **Player votes** while guests pick on their phones.
6. Pick the winning color. The audience does not see this pick.
7. Click **Start race**. Racers run for 20 seconds, then the chosen one hits the finish line.
8. **Reset** returns racers to the starting line, clears votes, and keeps the current theme and size.

Starting again after a finish (same winner or a new one) opens a new voting window.

## Player (`/player`)

While Spectator is on Derby and the race is idle: four large buttons for the themed racers. After picking, the phone confirms the choice. During the race or after finish, voting is locked.

## Spectator

- **Idle:** four racers on the starting line, no winner callout.
- **Racing:** time-synced from `startedAt`. A late-joining projector catches up mid-pack. Horses gallop; Wonderbar toys wiggle.
- **Finished:** winner banner. Wonderbar winner sprays from the tip. Reduced-motion clients jump to this state.

The spectator does not stream racer positions. Every screen derives progress from the shared start time, duration, winner, and seed. Vote tallies stay on the operator panel only.
