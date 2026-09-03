export function ItemCurtain({ open }: Readonly<{ open: boolean }>) {
  return (
    <div
      className={`price-curtain${open ? " price-curtain-open" : ""}`}
      aria-hidden
    >
      <div className="price-curtain-valance" />
      <div className="price-curtain-panel price-curtain-left" />
      <div className="price-curtain-panel price-curtain-right" />
    </div>
  );
}
