// Client side of the AI photo try-on: prepares the two images and calls our FastAPI backend,
// which forwards them to the try-on model (see backend/). The API key never reaches the browser.

export const TRYON_API = (process.env.NEXT_PUBLIC_TRYON_API_URL || "").replace(/\/$/, "");

const MAX_SIDE = 1296; // the try-on model works at 864×1296

/** Downscales a photo and returns it as a JPEG data URL. */
export async function photoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return c.toDataURL("image/jpeg", 0.9);
}

/** Rasterises a product's flat-lay SVG onto white, as the garment image for the model. */
export async function svgToDataUrl(svg: SVGSVGElement, width = 768): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const img = new Image();
  img.src = src;
  await img.decode();
  const vb = svg.viewBox.baseVal;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((width * vb.height) / vb.width);
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.92);
}

export class TryOnError extends Error {}

export async function requestTryOn(input: {
  personImage: string;
  garmentImage: string;
  category: "auto" | "tops" | "bottoms" | "one-pieces";
  signal?: AbortSignal;
}): Promise<string> {
  if (!TRYON_API) throw new TryOnError("The AI try-on server isn't connected on this demo yet.");
  let res: Response;
  try {
    res = await fetch(`${TRYON_API}/tryon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_image: input.personImage,
        garment_image: input.garmentImage,
        category: input.category,
        garment_photo_type: "flat-lay",
      }),
      signal: input.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new TryOnError("Couldn't reach the try-on server. Check your connection and try again.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new TryOnError(body.detail || "The try-on didn't work this time. Please try again.");
  return body.image as string;
}
