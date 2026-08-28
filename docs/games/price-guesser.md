# Price Guesser

Live guessing game. The operator puts a product photo on the projector with a hidden price tag. The player guesses out loud; the operator reveals the real price.

There is no player phone board.

## Operator

1. Select **Price Guesser** in the left nav.
2. Put **Price Guesser** on the Spectator screen so the projector shows the item.
3. Upload a photo, optionally name the item, and enter the real price.
4. After guesses, click **Reveal price**. **Hide price** covers it again.
5. **Clear item** removes the photo and price for the next round.

Photos are stored in MongoDB (`media`) and referenced from game state. Replacing or clearing an item deletes the previous photo.

## Spectator

Shows the current photo, optional name, and a price tag. The tag reads `???` until the operator reveals.
