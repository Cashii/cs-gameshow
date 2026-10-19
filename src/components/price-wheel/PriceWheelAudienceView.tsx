import { PriceShowStage } from "@/components/price/PriceShowStage";
import "@/styles/price-audience.css";
import "@/styles/price-wheel-audience.css";
import {
  priceWheelColumns,
  type PriceWheelState,
} from "@/lib/price-wheel/types";

export function PriceWheelAudienceView({
  game,
}: {
  game: PriceWheelState;
}) {
  const players = game.players ?? [];
  if (players.length === 0) {
    return (
      <PriceShowStage>
        <p className="price-empty">Add players on the operator desk</p>
      </PriceShowStage>
    );
  }

  return (
    <PriceShowStage>
      <div
        className="pw-stage"
        data-cols={priceWheelColumns(players.length)}
      >
        {players.map((player) => (
          <div key={player.id} className="pw-player">
            <p className="pw-name">{player.name.trim() || "Player"}</p>
            <p className="pw-score">{player.score}</p>
          </div>
        ))}
      </div>
    </PriceShowStage>
  );
}
