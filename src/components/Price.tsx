import { formatPrice } from "@/lib/products";

export function Price({ price, mrp }: { price: number; mrp?: number }) {
  return (
    <span className="price">
      {formatPrice(price)}
      {mrp && mrp > price && (
        <>
          {" "}
          <s className="muted">{formatPrice(mrp)}</s>{" "}
          <span className="price__off">{Math.round((1 - price / mrp) * 100)}% off</span>
        </>
      )}
    </span>
  );
}
