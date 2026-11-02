import { ShopGrid } from "@/components/ShopGrid";
import { HeroTryOnButton } from "@/components/HeroTryOnButton";
import { GarmentArt } from "@/components/GarmentArt";
import { PRODUCTS } from "@/lib/products";

export default function Home() {
  const [tee, , shirt, , kurta] = PRODUCTS;
  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">New · Virtual fitting room</p>
          <h1>
            Try it on. <em>Right here.</em>
          </h1>
          <p className="hero__lede">
            Stand in front of your camera and see tees, shirts, kurtas, hoodies and jackets on yourself, live. Switch
            colours in a tap, then pick your size.
          </p>
          <div className="hero__actions">
            <HeroTryOnButton productId={tee.id} />
            <a href="#shop" className="btn btn--ghost">
              Shop the collection
            </a>
          </div>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__piece hero__piece--0">
            <GarmentArt product={kurta} colour={kurta.colours[1]} />
          </div>
          <div className="hero__piece hero__piece--1">
            <GarmentArt product={shirt} colour={shirt.colours[2]} />
          </div>
          <div className="hero__piece hero__piece--2">
            <GarmentArt product={tee} colour={tee.colours[2]} />
          </div>
        </div>
      </section>

      <section className="steps" aria-label="How the fitting room works">
        <ol>
          <li>
            <strong>Pick a piece</strong>
            <span>Tap “Try on” on any product.</span>
          </li>
          <li>
            <strong>Step back from the camera</strong>
            <span>Head to waist in frame, or use a photo.</span>
          </li>
          <li>
            <strong>Swap colours live</strong>
            <span>Compare before and after, then choose your size.</span>
          </li>
        </ol>
      </section>

      <ShopGrid />
    </>
  );
}
