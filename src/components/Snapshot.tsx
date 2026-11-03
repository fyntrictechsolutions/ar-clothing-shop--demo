"use client";

export function Snapshot({ src, filename, onClose }: { src: string; filename: string; onClose: () => void }) {
  return (
    <div className="snapshot" onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
        <img src={src} alt="Your try-on" />
        <figcaption>
          <a className="btn btn--primary" href={src} download={filename}>
            Save image
          </a>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
