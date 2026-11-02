// Loads MediaPipe Pose Landmarker once and shares it across the app.
// The wasm runtime and model are served from /public, so nothing loads from a CDN.

import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

let tracker: PoseLandmarker | null = null;
let loading: Promise<PoseLandmarker> | null = null;
let mode: "IMAGE" | "VIDEO" = "IMAGE";

export function loadPoseTracker(): Promise<PoseLandmarker> {
  if (tracker) return Promise.resolve(tracker);
  if (!loading) {
    loading = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(`${BASE}/mediapipe/wasm`);
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: `${BASE}/models/pose_landmarker_lite.task`, delegate },
        runningMode: "IMAGE" as const,
        numPoses: 1,
      });
      try {
        tracker = await PoseLandmarker.createFromOptions(fileset, options("GPU"));
      } catch {
        // Some phones and browsers have no usable WebGL; the CPU path is slower but works.
        tracker = await PoseLandmarker.createFromOptions(fileset, options("CPU"));
      }
      mode = "IMAGE";
      return tracker;
    })();
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

export async function setRunningMode(t: PoseLandmarker, next: "IMAGE" | "VIDEO") {
  if (mode !== next) {
    await t.setOptions({ runningMode: next });
    mode = next;
  }
}
