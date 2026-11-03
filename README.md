# Thira: AR fitting room demo store

A demo clothing e-commerce site by **Fyntrictech IT Solutions** with two ways to try clothes on:

- **Live colour.** The shopper's camera (or a photo) runs in the browser. An on-device segmentation model finds the
  top they are wearing and repaints it in the product's colour and print, keeping the real folds, shadows and body
  edges. Before/after compare and snapshots included. Instant, free and private.
- **AI try-on.** The shopper uploads one photo and a try-on model generates a photorealistic image of them wearing
  the actual garment, with its real cut, length and sleeves. Takes about 5 to 15 seconds and needs the small backend
  in `backend/`.

They can then pick a colour and size and add to bag. Thira is a fictional label; products, prices and reviews are sample data.

## Tech stack

| Part | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript, static export (`out/`) |
| Live colour | Google MediaPipe Image Segmenter with the `selfie_multiclass_256x256` model (`@mediapipe/tasks-vision`), on-device WebAssembly/WebGL; recolour on a canvas (`src/lib/recolour.ts`) |
| AI try-on | [FASHN](https://fashn.ai) virtual try-on API (`tryon-v1.6`), called from the backend |
| Backend | FastAPI (Python), only for AI try-on. Keeps the API key secret, limits requests per visitor |
| Hosting | Frontend on GitHub Pages (any static host works). Backend on Render, Railway, Fly or any Docker host |
| Data | Products in `src/lib/products.ts`; the bag is stored in the browser |

Live colour never sends video anywhere; the wasm files and model are served from `public/`, not a CDN.
AI try-on sends the one photo the shopper picks to the backend and FASHN.

## Run it locally

```bash
npm install        # also copies MediaPipe's wasm files into public/mediapipe
npm run dev        # http://localhost:3000
```

Camera access needs `localhost` or HTTPS. To try it on a phone, deploy it or use an HTTPS tunnel.

To use AI try-on locally, run the backend too:

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env               # then put your FASHN_API_KEY in .env
set -a && . ./.env && set +a
uvicorn main:app --reload --port 8000
pytest                             # 6 tests, no API key needed (FASHN is mocked)
```

and start the frontend with `NEXT_PUBLIC_TRYON_API_URL=http://localhost:8000 npm run dev`.

## Deploy

### Frontend (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds and publishes to
`https://<owner>.github.io/<repo>/` (*Settings → Pages → Source* must be **GitHub Actions**).

Without a backend the site still works; the AI try-on tab says the AI server isn't connected yet.

### Switching AI try-on on

1. **Get a FASHN API key** at [app.fashn.ai](https://app.fashn.ai) (API section) and add credits. One try-on image costs one credit.
2. **Deploy the backend on Render:** *New → Blueprint*, pick this repo. `render.yaml` sets everything up;
   paste the key into `FASHN_API_KEY` when asked. Note the service URL, e.g. `https://thira-tryon-api.onrender.com`.
   (The free plan sleeps when idle, so the first try-on after a break takes longer. Use a paid plan for live demos.)
3. **Point the site at it:** in GitHub, *Settings → Secrets and variables → Actions → Variables*, add
   `TRYON_API_URL` with the backend URL (no trailing slash), then re-run the *Deploy to GitHub Pages* workflow.

Backend settings (environment variables):

| Variable | Default | Meaning |
| --- | --- | --- |
| `FASHN_API_KEY` | none | Required. Never put it in the frontend |
| `FASHN_MODE` | `balanced` | `performance` (~5 s), `balanced` (~8 s) or `quality` (~12–17 s) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated sites allowed to call the API |
| `RATE_LIMIT_PER_HOUR` | `20` | Try-ons per visitor IP per hour, to protect your credits |

`GET /health` reports whether the key is set. `POST /tryon` takes `{person_image, garment_image, category, garment_photo_type}`
as data URIs and returns `{image, seconds}`.

Other hosts: `backend/Dockerfile` runs anywhere Docker does. Netlify or Vercel can host the frontend
(build command `npm run build`, output `out`; set `NEXT_PUBLIC_TRYON_API_URL` there). When hosting under a sub-path,
set `NEXT_PUBLIC_BASE_PATH=/sub-path` at build time.

## Where things live

```
src/app/page.tsx                    Home: hero, how it works, product grid
src/app/product/[id]/page.tsx       Product pages (one static page per product)
src/components/TryOn.tsx            Fitting room shell: mode tabs, products, colours, sizes, add to bag
src/components/LiveFittingRoom.tsx  Live colour: camera/photo, before/after, snapshot
src/components/AiFittingRoom.tsx    AI try-on: photo upload, generate, compare, view full size
src/lib/segmenter.ts                Loads MediaPipe once; returns the clothes mask for a frame
src/lib/recolour.ts                 Repaints the clothes area keeping the fabric's light and shade
src/lib/aiTryOn.ts                  Prepares images and calls the backend
src/lib/products.ts                 Catalogue: add products, colours, sizes and photos here
backend/main.py                     FastAPI app: /health, /tryon, CORS, rate limit
backend/tryon_provider.py           FASHN client (submit, poll, friendly errors)
```

### Adding a product

Add an entry to `PRODUCTS` in `src/lib/products.ts`. Its `pattern` (`solid`, `stripes`, `checks`, `dots`) and colourways
drive live colour; `style` and `sleeve` drive the flat-lay artwork.

For the best AI try-on results add real product photos, one per colour, in `photos` (put the files in `public/` or use
full `https://` URLs). Without photos, the generated flat-lay artwork is sent to the AI instead, which works but looks
less like a real product.

## Known limits

- Live colour changes the colour and print of what the shopper is already wearing, not the cut: a tee stays a tee.
  The AI try-on shows the real shape. The whole "clothes" area is recoloured, so a shirt and jacket worn together both change.
- Live colour speed depends on the phone. Recent phones run it smoothly; older ones fall back to a slower CPU path.
- AI try-on works best with a well-lit, front-facing photo from head to hips. It costs one FASHN credit per image.

## Ideas for the next version

- Real product photography and a CMS or Shopify/WooCommerce/Medusa backend for the catalogue
- Bottoms and full outfits (FASHN supports `bottoms` and `one-pieces`)
- Size suggestion from body proportions, and analytics on what people try versus buy

## Credits

Segmentation by [MediaPipe](https://ai.google.dev/edge/mediapipe) (Apache-2.0). The `selfie_multiclass_256x256.tflite`
model in `public/models/` is distributed by Google under the same licence. AI try-on by [FASHN](https://fashn.ai).
