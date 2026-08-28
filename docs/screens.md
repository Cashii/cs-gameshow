# Screens

## Operator

**Route:** `/operator`  
**Who:** Game host / AV operator  
**PIN:** Required (set in Settings)

Controls all games and Poll from the left nav. Spectator cover/live and which screen the projector shows are independent of the operator panel. Can also add or remove tokens from the pool. Opens the spectator window and exports/imports suite JSON as backup.

## Spectator

**Route:** `/spectator`  
**Who:** Projector / large display  
**PIN:** None

Read-only. Shows the operator-selected spectator screen when live (a game, standby, or poll). Polls no longer take over automatically — pick **Poll** in the Spectator screen dropdown to put results on the projector. **Derby** is the four-horse carnival race; the operator picks the winner off-air, then starts a 20-second animation. **Jeoparody** is a category board the operator advances from the desk (no player phones). **Elimination Trivia** is boolean questions on phones: remaining count on the projector, A/B split only after the operator reveals. Stop at any remaining count. **Price Guesser** shows one product photo with a hidden price tag the operator reveals. **Price Order** shows up to five photos; the operator builds the player's cheapest-to-most-expensive list, then reveals prices. **Question Time** shows a question, two team scores, and a giant countdown for in-the-room newlywed-style rounds.

## Hostess

**Route:** `/hostess`  
**Who:** Staff handing out tokens  
**PIN:** Required (operator sets in Settings)

Can only add tokens to the Live Drawer pool (single entry or bulk by color). Sees per-color pool counts and recent additions. Cannot draw or change games.

## Player

**Route:** `/player`  
**Who:** Guests participating via phone  
**PIN:** None

Open to anyone on the network. **Poll:** when the operator opens a poll, players see the question and vote once. **Elimination Trivia:** while a trivia series is running, phones show A/B buttons, still-in, or eliminated. Otherwise this screen stays on standby. Other games have no player board — those are operator + spectator (and hostess for Live Drawer).
