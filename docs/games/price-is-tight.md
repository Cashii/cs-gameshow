# Price is Tight

Live guessing game. The operator puts a product photo on the projector with a hidden price tag. The player guesses out loud; the operator reveals the real price.

There is no player phone board.

## Operator

1. Select **Price is Tight** in the left nav.
2. Put **Price is Tight** on the Spectator screen so the projector shows the item.
3. Upload a photo, optionally name the item, and enter the real price. A new photo starts behind a closed curtain.
4. Beside the item name, switch **Curtain closed** / **Item showing** to part the curtain on the spectator screen. The photo and name appear together.
5. Beside the price, switch **Price hidden** / **Price showing** after guesses.
6. **Show Correct** or **Show Not quite** puts a masked result overlay on the spectator screen. Click the same button again to hide it.
7. **Clear item** removes the photo and price for the next round.

Photos are stored in MongoDB (`media`) and referenced from game state. Replacing or clearing an item deletes the previous photo.

## Spectator

Shows the current photo, optional name, and a price tag. A red velvet curtain covers the photo and name until the operator reveals them together. The tag reads `???` until the operator reveals the price. The operator can then show a **Correct** or **Not quite** overlay over a darkened mask.

## Saved items

The folder icon on the game actions bar, and **Choose from item bank** under the photo, open a gallery of photos and names. That gallery is shared with Price Order. **Save this item** stores the photo, name, and price. Pick a photo to put that item on the desk with the curtain closed and the price hidden. Clearing the live item does not delete a saved photo.