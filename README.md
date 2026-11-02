# Thira: AR fitting room demo store

A demo clothing e-commerce site by **Fyntrictech IT Solutions** with a live AR fitting room in the browser.
Shoppers stand in front of their camera (or upload a photo) and see tees, shirts, kurtas, hoodies and jackets
on themselves in real time. The garment is built from the body's pose, so the torso follows the shoulders and
hips and each sleeve follows its arm. They can switch colours live, compare before and after, take a snapshot,
pick a size and add to bag.

Thira is a fictional label; products, prices and reviews are sample data.

## Tech stack

| Part | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Body tracking | Google MediaPipe Pose Landmarker lite (`@mediapipe/tasks-vision`), 33 body points, runs on-device in WebAssembly/WebGL |
| Garment rendering | HTML canvas, garments generated from product data and fitted to the pose (`src/lib/garment.ts`) |
| Styling | Plain CSS (`src/app/globals.css`), light and dark themes |
| Hosting | Static export (`out/`), so any HTTPS host works: GitHub Pages, Netlify, Vercel, S3 |
| Backend | None yet. Products are in `src/lib/products.ts`; the bag is stored in the browser |

No images or video leave the device, and nothing loads from a CDN at runtime: the MediaPipe wasm files and model are served from `public/`.

## Run it locally

```bash
npm install        # also copies MediaPipe's wasm files into public/mediapipe
npm run dev        # http://localhost:3000
```

Camera access needs `localhost` or HTTPS. To try it on a phone, deploy it (below) or use an HTTPS tunnel.

## Build and deploy

```bash
npm run build      # writes the static site to out/
npx serve out      # preview the production build
```

**GitHub Pages:** push to `main` on GitHub, then set *Settings → Pages → Source* to **GitHub Actions**.
`.github/workflows/deploy-pages.yml` builds and publishes to `https://<user>.github.io/<repo>/`.

**Netlify / Vercel:** import the repo; build command `npm run build`, output directory `out`.

When hosting under a sub-path, set `NEXT_PUBLIC_BASE_PATH=/sub-path` at build time.

## Where things live

```
src/app/page.tsx                 Home: hero, how it works, product grid
src/app/product/[id]/page.tsx    Product pages (one static page per product)
src/components/TryOn.tsx         Fitting room: camera/photo, colours, sizes, before/after, snapshot
src/components/GarmentArt.tsx    Flat-lay product artwork (SVG) drawn from the product data
src/lib/poseTracker.ts           Loads MediaPipe once and switches between photo and video mode
src/lib/garment.ts               Fits and draws each garment style from the body landmarks
src/lib/products.ts              Catalogue: add products, colours and sizes here
```

### Adding a product

Add an entry to `PRODUCTS` in `src/lib/products.ts`. Its `style` (`tee`, `shirt`, `hoodie`, `kurta`, `jacket`),
`sleeve` (`short`, `long`) and `pattern` (`solid`, `stripes`, `checks`, `dots`) decide how it is drawn, and each
colourway is a name, a main colour and an accent colour.

## Known limits

- The garment is a 2D overlay, so it sits in front of the body: arms crossed in front of the chest end up under it.
  Adding MediaPipe's segmentation mask would let arms and hands show on top.
- Works best facing the camera from about 1.5 m with head to waist in frame.

## Ideas for the next version

- Real product photos and a CMS or Shopify/WooCommerce/Medusa backend for the catalogue
- Garments from real product photos (cut-out PNGs warped to the pose) instead of generated shapes
- Bottoms and full outfits, plus accessories (caps, sunglasses) with face tracking
- Size suggestion from body proportions, and analytics on what people try versus buy

## Credits

Face tracking by [MediaPipe](https://ai.google.dev/edge/mediapipe) (Apache-2.0). The `pose_landmarker_lite.task` model in
`public/models/` is distributed by Google under the same licence.
