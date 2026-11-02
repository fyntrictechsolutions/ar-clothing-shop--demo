"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { openFrontCamera } from "@/lib/camera";
import { loadPoseTracker, setRunningMode } from "@/lib/poseTracker";
import { GarmentRenderer, type BodyPoint, type FitResult } from "@/lib/garment";
import { PRODUCTS, getProduct } from "@/lib/products";
import { GarmentArt } from "./GarmentArt";
import { Price } from "./Price";
import { useStore } from "./StoreProvider";

type Source = "starting" | "camera" | "photo" | "choose";

const MAX_PHOTO_SIDE = 1280;
const SMOOTHING = 0.5; // 0..1, higher follows the body faster but jitters more

const FIT_MESSAGE: Record<Exclude<FitResult, "ok">, string> = {
  "no-body": "Step back so your head, shoulders and waist are in the frame",
  "too-close": "You're a little close. Step back from the camera",
};

export function TryOn({ productId, colourIdx }: { productId: string; colourIdx: number }) {
  const { closeTryOn, addToCart } = useStore();
  const first = getProduct(productId) ?? PRODUCTS[0];

  const [activeId, setActiveId] = useState(first.id);
  const [colour, setColour] = useState<Record<string, number>>({ [first.id]: colourIdx });
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [source, setSource] = useState<Source>("starting");
  const [message, setMessage] = useState<string | null>("Starting camera…");
  const [trackerReady, setTrackerReady] = useState(false);
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(0.5);
  const [aspect, setAspect] = useState(3 / 4);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GarmentRenderer | null>(null);
  const trackerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});
  const landmarksRef = useRef<BodyPoint[] | null>(null);
  const wearingRef = useRef({ productId: first.id, colourIdx });
  const splitRef = useRef<number | null>(null);
  const lastVideoTime = useRef(-1);
  const lastMessage = useRef<string | null>(null);

  const active = getProduct(activeId) ?? first;
  const activeColour = colour[active.id] ?? 0;

  // ---------- drawing ----------

  const say = useCallback((m: string | null) => {
    if (m !== lastMessage.current) {
      lastMessage.current = m;
      setMessage(m);
    }
  }, []);

  /** Draws the current frame plus garment; returns how well the garment fitted. */
  const draw = useCallback((): FitResult | null => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    if (!canvas || !base || base.width === 0) return null;
    if (canvas.width !== base.width || canvas.height !== base.height) {
      canvas.width = base.width;
      canvas.height = base.height;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(base, 0, 0);
    const lm = landmarksRef.current;
    const p = getProduct(wearingRef.current.productId);
    if (!lm || !p || !rendererRef.current) return lm ? null : "no-body";
    const splitX = splitRef.current === null ? null : splitRef.current * canvas.width;
    return rendererRef.current.render(ctx, base, lm, p, p.colours[wearingRef.current.colourIdx], splitX);
  }, []);

  useEffect(() => {
    wearingRef.current = { productId: active.id, colourIdx: activeColour };
    splitRef.current = compare ? split : null;
    if (source === "photo") {
      const fit = draw();
      if (fit && landmarksRef.current) say(fit === "ok" ? null : FIT_MESSAGE[fit]);
    }
  }, [active.id, activeColour, compare, split, source, draw, say]);

  const applyResult = useCallback((result: PoseLandmarkerResult, smooth: boolean) => {
    const pose = result.landmarks?.[0];
    if (!pose) {
      landmarksRef.current = null;
      return false;
    }
    const prev = landmarksRef.current;
    if (smooth && prev && prev.length === pose.length) {
      for (let i = 0; i < pose.length; i++) {
        prev[i].x += (pose[i].x - prev[i].x) * SMOOTHING;
        prev[i].y += (pose[i].y - prev[i].y) * SMOOTHING;
        prev[i].visibility = pose[i].visibility;
      }
    } else {
      landmarksRef.current = pose.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility }));
    }
    return true;
  }, []);

  // ---------- camera ----------

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // One camera frame: mirror it, track the body, draw the garment, schedule the next frame.
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

    const tracker = trackerRef.current;
    if (tracker) applyResult(tracker.detectForVideo(base, performance.now()), true);
    const fit = draw();
    if (tracker && fit) say(fit === "ok" ? null : FIT_MESSAGE[fit]);
  }, [draw, applyResult, say]);

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
      landmarksRef.current = null;
      lastVideoTime.current = -1;
      setSource("camera");
      say(trackerRef.current ? null : "Loading body tracking…");
      if (trackerRef.current) await setRunningMode(trackerRef.current, "VIDEO");
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
      say("Finding you in the photo…");
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
        landmarksRef.current = null;
        draw();

        const tracker = trackerRef.current ?? (await loadPoseTracker());
        trackerRef.current = tracker;
        await setRunningMode(tracker, "IMAGE");
        const found = applyResult(tracker.detect(base), false);
        const fit = draw();
        say(!found ? "We couldn't find a person. Try a photo showing your head to your waist." : fit && fit !== "ok" ? FIT_MESSAGE[fit] : null);
      } catch {
        say("That photo couldn't be opened. Try a JPG or PNG.");
      }
    },
    [draw, stopCamera, applyResult, say],
  );

  // ---------- lifecycle ----------

  useEffect(() => {
    baseRef.current = document.createElement("canvas");
    rendererRef.current = new GarmentRenderer();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let cancelled = false;
    loadPoseTracker()
      .then(async (tracker) => {
        if (cancelled) return;
        trackerRef.current = tracker;
        if (streamRef.current) {
          await setRunningMode(tracker, "VIDEO");
          say(null);
        }
        setTrackerReady(true);
      })
      .catch(() => {
        if (!cancelled) say("Body tracking couldn't load on this device. Try a recent Chrome or Safari.");
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the camera; state updates happen after awaits
    startCamera();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeTryOn();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      stopCamera();
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeTryOn, startCamera, stopCamera, say]);

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

  const addToBag = () => {
    if (!size) {
      setNeedSize(true);
      return;
    }
    addToCart(active.id, activeColour, size);
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
    <div className="tryon" role="dialog" aria-modal="true" aria-label="Virtual try-on">
      <div className="tryon__bar">
        <button type="button" className="btn btn--ghost btn--small" onClick={closeTryOn}>
          ← Back to shop
        </button>
        <span className="tryon__title">
          <span className="live-dot" aria-hidden="true" /> Virtual fitting room
        </span>
      </div>

      <div className="tryon__body">
        <div className="tryon__stage-col">
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
                  Allow camera access and try again, or use a photo of yourself from head to waist. Photos stay on your
                  device.
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
            {!trackerReady && hasFrame
              ? "Loading body tracking for the first time…"
              : "Tip: prop your phone up and stand about 1.5 m back, facing the camera."}
          </p>
        </div>

        <aside className="tryon__panel">
          <div className="product-tabs" role="tablist" aria-label="Products">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === active.id}
                className="product-tab"
                onClick={() => {
                  setActiveId(p.id);
                  setSize(null);
                  setNeedSize(false);
                }}
              >
                <span className="product-tab__art">
                  <GarmentArt product={p} colour={p.colours[colour[p.id] ?? 0]} />
                </span>
                <span className="product-tab__name">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="panel-block">
            <div className="panel-block__head">
              <h2>{active.name}</h2>
            </div>
            <Price price={active.price} mrp={active.mrp} />
            <p className="muted small">
              {active.fit} · {active.fabric}
            </p>
          </div>

          <div className="panel-block">
            <h3>Colour · {active.colours[activeColour].name}</h3>
            <div className="picker__row">
              {active.colours.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  className="swatch swatch--large"
                  aria-pressed={i === activeColour}
                  aria-label={c.name}
                  title={c.name}
                  style={{ background: `linear-gradient(135deg, ${c.hex} 55%, ${c.accent} 55%)` }}
                  onClick={() => setColour((m) => ({ ...m, [active.id]: i }))}
                />
              ))}
            </div>
            <h3>
              Size {needSize && !size && <span className="picker__warn">Pick a size first</span>}
            </h3>
            <div className="picker__row">
              {active.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="size"
                  aria-pressed={s === size}
                  onClick={() => {
                    setSize(s);
                    setNeedSize(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={addToBag}>
              Add to bag
            </button>
          </div>
        </aside>
      </div>

      {snapshot && (
        <div className="snapshot" onClick={() => setSnapshot(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the canvas */}
            <img src={snapshot} alt="Your try-on snapshot" />
            <figcaption>
              <a className="btn btn--primary" href={snapshot} download="thira-fit.jpg">
                Save image
              </a>
              <button type="button" className="btn btn--ghost" onClick={() => setSnapshot(null)}>
                Close
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
