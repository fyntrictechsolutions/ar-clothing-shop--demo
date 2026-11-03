"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";
import { openFrontCamera } from "@/lib/camera";
import { clothesMask, loadSegmenter, setRunningMode, type ClothesMask } from "@/lib/segmenter";
import { Recolourer } from "@/lib/recolour";
import type { Colourway, Product } from "@/lib/products";
import { Snapshot } from "./Snapshot";

type Source = "starting" | "camera" | "photo" | "choose";

const MAX_PHOTO_SIDE = 1280;
const MIN_COVERAGE = 0.02; // share of the frame that must be clothes before we recolour

/** Live recolour: the shopper's own top, repainted in the product's colour and print. */
export function LiveFittingRoom({ product, colour }: { product: Product; colour: Colourway }) {
  const [source, setSource] = useState<Source>("starting");
  const [message, setMessage] = useState<string | null>("Starting camera…");
  const [ready, setReady] = useState(false);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(0.5);
  const [aspect, setAspect] = useState(3 / 4);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const recolourRef = useRef<Recolourer | null>(null);
  const segRef = useRef<ImageSegmenter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const maskRef = useRef<ClothesMask | null>(null);
  const rafRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});
  const lookRef = useRef({ product, colour });
  const splitRef = useRef<number | null>(null);
  const lastVideoTime = useRef(-1);
  const lastMessage = useRef<string | null>(null);

  const say = useCallback((m: string | null) => {
    if (m !== lastMessage.current) {
      lastMessage.current = m;
      setMessage(m);
    }
  }, []);

  /** Draws the frame with recoloured clothes; returns clothes coverage (null if nothing to draw). */
  const draw = useCallback((): number | null => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base || base.width === 0) return null;
    if (canvas.width !== base.width || canvas.height !== base.height) {
      canvas.width = base.width;
      canvas.height = base.height;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(base, 0, 0);
    const mask = maskRef.current;
    if (!mask || !recolourRef.current) return null;
    const { product: p, colour: c } = lookRef.current;
    const splitX = splitRef.current === null ? null : splitRef.current * canvas.width;
    return recolourRef.current.render(ctx, mask, p.pattern, c, splitX);
  }, []);

  const report = useCallback(
    (coverage: number | null) => {
      if (coverage === null) return;
      say(coverage < MIN_COVERAGE ? "Step back so your top is in the frame" : null);
    },
    [say],
  );

  useEffect(() => {
    lookRef.current = { product, colour };
    splitRef.current = compare ? split : null;
    if (source === "photo") draw();
  }, [product, colour, compare, split, source, draw]);

  // ---------- camera ----------

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // One camera frame: mirror it, find the clothes, recolour them, schedule the next frame.
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => tickRef.current());
    const video = videoRef.current;
    const base = baseRef.current;
    if (!video || !base || video.readyState < 2 || video.currentTime === lastVideoTime.current) return;
    lastVideoTime.current = video.currentTime;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (base.width !== w || base.height !== h) {
      base.width = w;
      base.height = h;
      setAspect(w / h);
    }
    const b = base.getContext("2d")!;
    b.save();
    b.translate(w, 0);
    b.scale(-1, 1);
    b.drawImage(video, 0, 0, w, h);
    b.restore();

    const seg = segRef.current;
    if (seg) maskRef.current = clothesMask(seg, base, performance.now());
    const coverage = draw();
    if (seg) report(coverage ?? 0);
  }, [draw, report]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(async () => {
    stopCamera();
    say("Starting camera…");
    setSource("starting");
    try {
      const { video, stream } = await openFrontCamera();
      streamRef.current = stream;
      videoRef.current = video;
      maskRef.current = null;
      lastVideoTime.current = -1;
      setSource("camera");
      say(segRef.current ? null : "Loading clothes detection…");
      if (segRef.current) await setRunningMode(segRef.current, "VIDEO");
      tickRef.current();
    } catch {
      setSource("choose");
      say(null);
    }
  }, [stopCamera, say]);

  // ---------- photo ----------

  const openPhoto = useCallback(
    async (file: File) => {
      stopCamera();
      setSource("photo");
      setCompare(false);
      say("Finding your clothes…");
      try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);
        const base = baseRef.current!;
        base.width = w;
        base.height = h;
        base.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        setAspect(w / h);
        maskRef.current = null;
        draw();

        const seg = segRef.current ?? (await loadSegmenter());
        segRef.current = seg;
        await setRunningMode(seg, "IMAGE");
        maskRef.current = clothesMask(seg, base);
        report(draw() ?? 0);
      } catch {
        say("That photo couldn't be opened. Try a JPG or PNG.");
      }
    },
    [draw, stopCamera, say, report],
  );

  // ---------- lifecycle ----------

  useEffect(() => {
    baseRef.current = document.createElement("canvas");
    recolourRef.current = new Recolourer();
    let cancelled = false;
    loadSegmenter()
      .then(async (seg) => {
        if (cancelled) return;
        segRef.current = seg;
        if (streamRef.current) {
          await setRunningMode(seg, "VIDEO");
          say(null);
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) say("Clothes detection couldn't load on this device. Try a recent Chrome or Safari.");
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the camera; state updates happen after awaits
    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [startCamera, stopCamera, say]);

  // ---------- controls ----------

  const moveSplit = (e: React.PointerEvent) => {
    if (!compare || !stageRef.current) return;
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") return;
    const r = stageRef.current.getBoundingClientRect();
    setSplit(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const keep = splitRef.current;
    splitRef.current = null;
    draw();
    setSnapshot(canvas.toDataURL("image/jpeg", 0.92));
    splitRef.current = keep;
    draw();
  };

  const hasFrame = source === "camera" || source === "photo";
  const photoInput = (label: string, className: string, capture?: boolean) => (
    <label className={className}>
      {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? "user" : undefined}
        hidden
        onChange={(e) => e.target.files?.[0] && openPhoto(e.target.files[0])}
      />
    </label>
  );

  return (
    <>
      <div
        ref={stageRef}
        className={`stage${compare ? " stage--compare" : ""}`}
        style={{ "--ar": aspect } as React.CSSProperties}
        onPointerDown={moveSplit}
        onPointerMove={moveSplit}
      >
        <canvas ref={canvasRef} className="stage__canvas" hidden={!hasFrame} />
        {compare && hasFrame && (
          <div className="stage__split" style={{ left: `${split * 100}%` }}>
            <span className="stage__label stage__label--before">Before</span>
            <span className="stage__label stage__label--after">After</span>
          </div>
        )}
        {source === "choose" && (
          <div className="chooser">
            <p className="chooser__title">Camera isn&apos;t available</p>
            <p className="muted">
              Allow camera access and try again, or use a photo of yourself wearing a top. Photos stay on your device.
            </p>
            <div className="chooser__actions">
              {photoInput("Take a photo", "btn btn--primary", true)}
              {photoInput("Upload a photo", "btn btn--ghost")}
              <button type="button" className="btn btn--ghost" onClick={startCamera}>
                Try camera again
              </button>
            </div>
          </div>
        )}
        {message && source !== "choose" && <div className="stage__msg">{message}</div>}
      </div>

      <div className="stage-tools">
        <button type="button" className="tool" aria-pressed={compare} onClick={() => setCompare((c) => !c)} disabled={!hasFrame}>
          Before / after
        </button>
        <button type="button" className="tool" onClick={takeSnapshot} disabled={!hasFrame}>
          Snapshot
        </button>
        {source === "camera" ? (
          photoInput("Use a photo", "tool")
        ) : (
          <button type="button" className="tool" onClick={startCamera}>
            Use camera
          </button>
        )}
      </div>
      <p className="muted small center">
        {!ready && hasFrame
          ? "Loading clothes detection for the first time…"
          : "Shows this colour and print on the top you're wearing. Use AI try-on to see the actual cut."}
      </p>

      {snapshot && <Snapshot src={snapshot} filename="thira-live.jpg" onClose={() => setSnapshot(null)} />}
    </>
  );
}
