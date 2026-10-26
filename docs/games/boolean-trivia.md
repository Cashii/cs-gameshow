# Elimination Trivia

Boolean trivia used to cut the field. Guests answer True/False (or any A/B pair) on `/player` until remaining is whatever size you want.

Question 1 **is** the roster: anyone who answers Q1 and is on the surviving side is in the series. Phones that never answer Q1 are not playing (standby, not “eliminated”). Later questions only accept votes from remaining devices. Wrong side or no vote → out, and that phone is told so.

Stop whenever remaining count hits your target. You do not have to play down to one.

You can stage several upcoming questions in a queue. Starting the next question loads the first queued item. Closed rounds stay in History for review until you reset the series.

## Operator

1. Select **Elimination Trivia** in the left nav. Put **Elimination Trivia** on the Spectator screen (it sits after Jeoparody, same order as the left games list).
2. Optionally **Add to queue** and fill upcoming questions (reorder or delete as needed).
3. Type the live question and its answer labels. In the bar under the title, **Open voting**.
4. Watch **answers in**. Operator can see the A/B split; the projector does not until you reveal.
5. **Lock voting**, then tap **Survive A** or **Survive B**. Remaining count updates. Phones flip to still-in or out.
6. If remaining hits **0**, **Undo reveal** and pick the other side. **Try this round again** puts those players back in and clears the question so you can ask a different one for the same round. **End game** closes the series with no winners. **Undo end** brings that choice back.
7. If remaining is still above your cut, **Start question N** (pulls the next queued question when one exists) and repeat from step 3.
8. When remaining is the size you want, click **Declare remaining as winners**. Those phones get the winner screen. If you play until **1**, declare that one player the same way.
9. Review past rounds under **History**. **Undo winners** takes you back to the last reveal if you called it too soon. **Reset series**, in the bar under the title, clears votes, the player list, the queue, and history.

## Player (`/player`)

Uses the same device ID as O69 Club Poll (UUID in `localStorage`, 4-character code on screen). No PIN.

- Eligible + voting open: two large buttons, then “answer locked”.
- After reveal, still in: remaining count.
- Eliminated: full-screen out.
- Missed Q1 after the field is set: “not in this round”.
- Last remaining (if you play that far): winner.

Player phones show Elimination Trivia only while the Spectator screen is set to Elimination Trivia. Switch Spectator to O69 Club Poll (or anything else) and phones follow that instead, even if a trivia series is still leftover in the suite.

## Spectator

Question, both labels, and remaining count. While open, shows how many answers are in — not the A/B split. After reveal, highlights the surviving side and the new remaining number.

## Notes

Device IDs stay in Mongo (`triviaVotes`, `triviaPlayers`), not on the public event snapshot. Snapshot only carries counts and round metadata. Unique vote index: `(eventId, roundId, deviceId)`.

## Questions

The folder icon in the bar under the title opens saved questions. Each row shows the question and every answer. **Add question** stores a new question with its answers. **Save this question** stores the question on screen. **Save upcoming** stores the queue. **Add to queue** puts a saved question at the end of the upcoming queue. The question on screen, votes, and history stay. **Reset series** does not delete the list.
