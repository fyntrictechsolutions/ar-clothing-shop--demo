"use client";

import { useEffect, useRef, useState } from "react";
import { TRYON_API, TryOnError, photoToDataUrl, requestTryOn, svgToDataUrl } from "@/lib/aiTryOn";
import type { Colourway, Product } from "@/lib/products";
import { GarmentArt } from "./GarmentArt";
import { Snapshot } from "./Snapshot";

type Status = "idle" | "working" | "done" | "error";

/** AI photo try-on: the shopper's photo plus the product, turned into a realistic photo by the model. */
export function AiFittingRoom({ product, colour, colourIdx }: { product: Product; colour: Colourway; colourIdx: number }) {
  const [person, setPerson] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultFor, setResultFor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [edge, setEdge] = useState(0); // where the AI result starts, 0..1 across the photo
  const [aspect, setAspect] = useState(3 / 4);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lookKey = `${product.id}|${colourIdx}`;
  const stale = result !== null && resultFor !== lookKey;

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (status !== "working") return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [status]);

  const choosePhoto = async (file: File) => {
    abortRef.current?.abort();
    const url = await photoToDataUrl(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    setAspect(img.width / img.height);
    setPerson(url);
    setResult(null);
    setResultFor(null);
    setStatus("idle");
    setError(null);
  };

  const generate = async () => {
    if (!person) return;
    const svg = artRef.current?.querySelector("svg");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("working");
    setElapsed(0);
    setError(null);
    try {
      const garmentImage = product.photos?.[colourIdx] ?? (svg ? await svgToDataUrl(svg) : "");
      const image = await requestTryOn({
        personImage: person,
        garmentImage,
        category: product.style === "kurta" ? "auto" : "tops",
        signal: controller.signal,
      });
      setResult(image);
      setResultFor(lookKey);
      setEdge(0);
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof TryOnError ? e.message : "The try-on didn't work this time. Please try again.");
      setStatus("error");
    }
  };

  const moveSplit = (e: React.PointerEvent) => {
    if (!result || !stageRef.current) return;
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") return;
    const r = stageRef.current.getBoundingClientRect();
    setEdge(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };

  const photoInput = (label: string, className: string, capture?: boolean) => (
    <label className={className}>
      {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? "user" : undefined}
        hidden
        onChange={(e) => e.target.files?.[0] && choosePhoto(e.target.files[0])}
      />
    </label>
  );

  return (
    <>
      {/* The garment image sent to the model is rendered from the product artwork. */}
      <div ref={artRef} hidden aria-hidden="true">
        <GarmentArt product={product} colour={colour} />
      </div>

      <div
        ref={stageRef}
        className={`stage${result ? " stage--compare" : ""}`}
        style={{ "--ar": aspect } as React.CSSProperties}
        onPointerDown={moveSplit}
        onPointerMove={moveSplit}
      >
        {!person ? (
          <div className="chooser">
            <p className="chooser__title">AI try-on</p>
            <p className="muted">
              Add a photo of yourself and we&apos;ll show you wearing the {product.name.toLowerCase()}, with realistic fit and
              drape.
            </p>
            <ul className="tips">
              <li>Stand facing the camera, head to hips in frame</li>
              <li>Good light, plain background</li>
              <li>A fitted top works best</li>
            </ul>
            <div className="chooser__actions">
              {photoInput("Take a photo", "btn btn--primary", true)}
              {photoInput("Upload a photo", "btn btn--ghost")}
            </div>
            {!TRYON_API && <p className="muted small">The AI try-on server isn&apos;t connected on this demo yet.</p>}
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
            <img className="stage__img" src={person} alt="Your photo" />
            {result && (
              // eslint-disable-next-line @next/next/no-img-element -- model output
              <img
                className="stage__img stage__img--result"
                src={result}
                alt={`You wearing the ${product.name}`}
                style={{ clipPath: `inset(0 0 0 ${edge * 100}%)` }}
              />
            )}
            {result && edge > 0 && (
              <div className="stage__split" style={{ left: `${edge * 100}%` }}>
                <span className="stage__label stage__label--before">Before</span>
                <span className="stage__label stage__label--after">After</span>
              </div>
            )}
            {status === "working" && (
              <div className="stage__busy">
                <span className="spinner" aria-hidden="true" />
                <p>Creating your look… {elapsed}s</p>
                <p className="small">Usually takes about 10 seconds</p>
              </div>
            )}
            {error && <div className="stage__msg">{error}</div>}
            {stale && status !== "working" && <div className="stage__msg">You changed the product. Generate again to see it.</div>}
          </>
        )}
      </div>

      <div className="stage-tools">
        {person && (
          <button type="button" className="tool tool--primary" onClick={generate} disabled={status === "working"}>
            {result ? "Generate again" : "Generate try-on"}
          </button>
        )}
        {result && (
          <button type="button" className="tool" onClick={() => setSnapshot(result)}>
            View full size
          </button>
        )}
        {person && photoInput("Change photo", "tool")}
      </div>
      <p className="muted small center">
        {result ? "Drag across the photo to compare before and after." : "Your photo is sent to the try-on service only to create this image."}
      </p>

      {snapshot && <Snapshot src={snapshot} filename="thira-ai-tryon.png" onClose={() => setSnapshot(null)} />}
    </>
  );
}
