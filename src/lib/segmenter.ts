// Loads MediaPipe's multiclass selfie segmenter once and shares it across the app.
// It labels every pixel as background, hair, body skin, face skin, clothes or accessories.
// The wasm runtime and model are served from /public, so nothing loads from a CDN.

import type { ImageSegmenter, ImageSegmenterResult } from "@mediapipe/tasks-vision";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Index of the "clothes" class in the selfie_multiclass_256x256 model. */
export const CLOTHES = 4;

let segmenter: ImageSegmenter | null = null;
let loading: Promise<ImageSegmenter> | null = null;
let mode: "IMAGE" | "VIDEO" = "IMAGE";

export function loadSegmenter(): Promise<ImageSegmenter> {
  if (segmenter) return Promise.resolve(segmenter);
  if (!loading) {
    loading = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}/mediapipe/wasm`);
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: `${BASE}/models/selfie_multiclass_256x256.tflite`, delegate },
        runningMode: "IMAGE" as const,
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      try {
        segmenter = await ImageSegmenter.createFromOptions(fileset, options("GPU"));
      } catch {
        // Some phones and browsers have no usable WebGL; the CPU path is slower but works.
        segmenter = await ImageSegmenter.createFromOptions(fileset, options("CPU"));
      }
      mode = "IMAGE";
      return segmenter;
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

export async function setRunningMode(s: ImageSegmenter, next: "IMAGE" | "VIDEO") {
  if (mode !== next) {
    await s.setOptions({ runningMode: next });
    mode = next;
  }
}

export interface ClothesMask {
  data: Float32Array;
  width: number;
  height: number;
}

/**
 * Runs the segmenter on `frame` and copies out the clothes confidence mask.
 * MediaPipe frees its masks when the callback returns, hence the copy.
 * Pass `timestamp` in video mode.
 */
export function clothesMask(s: ImageSegmenter, frame: HTMLCanvasElement, timestamp?: number): ClothesMask | null {
  let out: ClothesMask | null = null;
  const take = (result: ImageSegmenterResult) => {
    const m = result.confidenceMasks?.[CLOTHES];
    if (m) out = { data: m.getAsFloat32Array().slice(), width: m.width, height: m.height };
  };
  if (timestamp === undefined) s.segment(frame, take);
  else s.segmentForVideo(frame, timestamp, take);
  return out;
}
