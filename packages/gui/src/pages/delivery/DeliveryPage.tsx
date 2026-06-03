import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { extractVimeoId, extractVimeoHash } from "@get-down/shared";
import { useDeliveryPage, useDeliveryPhotos } from "../../api/hooks/useDelivery.js";
import "./delivery-page.css";

// The API base (empty in dev — Vite proxies; full URL in production).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
function thumbnailUrl(token: string, name: string): string {
  return `${API_BASE}/delivery/${token}/photos/thumbnail?name=${encodeURIComponent(name)}`;
}

function fileUrl(token: string, name: string): string {
  return `${API_BASE}/delivery/${token}/photos/file?name=${encodeURIComponent(name)}`;
}

function dropboxDownloadUrl(url: string): string {
  // Convert any ?dl=0 to ?dl=1, or append ?dl=1 if no query string.
  return url.includes("?")
    ? url.replace(/([?&])dl=\d/, "$1dl=1").replace(/\?(?!.*dl=)/, "?dl=1&")
    : `${url}?dl=1`;
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

interface LightboxProps {
  photos: string[];
  activeIndex: number;
  token: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function Lightbox({ photos, activeIndex, token, onClose, onPrev, onNext }: LightboxProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="dp-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="dp-lightbox__close" onClick={onClose} aria-label="Close">
        &times;
      </button>

      <div className="dp-lightbox__img-wrap" onClick={(e) => e.stopPropagation()}>
        <img
          src={fileUrl(token, photos[activeIndex])}
          alt={photos[activeIndex]}
        />
      </div>

      {photos.length > 1 && (
        <>
          <button
            className="dp-lightbox__nav dp-lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="Previous photo"
          >
            &#8249;
          </button>
          <button
            className="dp-lightbox__nav dp-lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="Next photo"
          >
            &#8250;
          </button>
        </>
      )}

      <div className="dp-lightbox__counter">
        {activeIndex + 1} / {photos.length}
      </div>
    </div>
  );
}

// ─── Shared icons ─────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── Video download button ────────────────────────────────────────────────────

function VideoDownloadButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/${token}/video-download`);
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as { url: string | null };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUnavailable(true);
      }
    } catch (err) {
      console.error("video download error:", err);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  if (unavailable) {
    return (
      <p className="dp-video-notice" style={{ marginTop: "1rem" }}>
        Direct download is not available for this film. Please use the Vimeo player menu to download, or contact us for help.
      </p>
    );
  }

  return (
    <button className="dp-download__btn" onClick={handleClick} disabled={loading}>
      <DownloadIcon />
      {loading ? "Preparing download..." : "Download your film"}
    </button>
  );
}


function PhotoThumb({
  name,
  token,
  onClick,
}: {
  name: string;
  token: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="dp-photo-thumb" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`View photo ${name}`}
    >
      {!loaded && <div className="dp-photo-thumb__skeleton" aria-hidden="true" />}
      <img
        src={thumbnailUrl(token, name)}
        alt={name}
        className={loaded ? "dp-img-loaded" : ""}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const { token } = useParams<{ token: string }>();
  const { data: page, isLoading, error } = useDeliveryPage(token ?? "");
  const { data: photosData, error: photosError } = useDeliveryPhotos(
    token ?? "",
    !!page?.dropboxUrl
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos = photosData?.photos.map((p) => p.name) ?? [];

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto = useCallback(
    () => setLightboxIndex((i) => (i == null ? null : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );
  const nextPhoto = useCallback(
    () => setLightboxIndex((i) => (i == null ? null : (i + 1) % photos.length)),
    [photos.length]
  );

  if (isLoading) {
    return (
      <div className="dp-loading">
        <span style={{ letterSpacing: "0.3em" }}>LOADING</span>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="dp-error">
        <p style={{ marginBottom: "0.5rem" }}>This page is not available.</p>
        <p style={{ fontSize: "0.7rem", color: "#3a3530" }}>
          If you believe this is an error, please contact us.
        </p>
      </div>
    );
  }

  const vimeoId = page.vimeoUrl ? extractVimeoId(page.vimeoUrl) : null;
  const vimeoHash = page.vimeoUrl ? extractVimeoHash(page.vimeoUrl) : null;

  const heroTitle = page.deliveryTitle
    ? page.deliveryTitle
    : page.partnerName
      ? <>{page.firstName}<span className="dp-hero__ampersand">&amp;</span>{page.partnerName}</>
      : `${page.firstName} ${page.lastName}`;

  return (
    <div className="dp-root">
      {/* Branding */}
      <header className="dp-header">
        <img src="/logo.png" alt="Every Angle" className="dp-logo" />
      </header>

      {/* Hero */}
      <section className="dp-hero">
        <p className="dp-hero__eyebrow">Your film &amp; photos</p>
        <h1 className="dp-hero__names">{heroTitle}</h1>
        <p className="dp-hero__date">{formatEventDate(page.date)}</p>
        {page.venueName && <p className="dp-hero__venue">{page.venueName}</p>}
      </section>

      {/* Video */}
      {vimeoId && (
        <>
          <hr className="dp-divider" />
          <section className="dp-section">
            <p className="dp-section__heading">Your film</p>
            <div className="dp-video-wrapper">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}${vimeoHash ? `?h=${vimeoHash}&` : "?"}title=0&byline=0&portrait=0&color=b89b72`}
                allow="autoplay; fullscreen; picture-in-picture"
                title="Your wedding film"
              />
            </div>
            <div className="dp-video-actions">
              <VideoDownloadButton token={token!} />
            </div>
            <p className="dp-video-notice">
              We recommend downloading your film and saving a copy in at least two places, such as an external hard drive and cloud storage. We cannot guarantee that this link will remain active indefinitely, so please back up your film as soon as possible.
            </p>
          </section>
        </>
      )}

      {/* Photos */}
      {page.dropboxUrl && (
        <>
          <hr className="dp-divider" />
          <section className="dp-section">
            <p className="dp-section__heading">Your photos</p>

            {photosError ? (
              <p className="dp-photos-error">
                Photos are not available right now. Please try again later or use the download button below.
              </p>
            ) : photos.length > 0 ? (
              <div className="dp-photos-grid">
                {photos.map((name, i) => (
                  <PhotoThumb
                    key={name}
                    name={name}
                    token={token!}
                    onClick={() => openLightbox(i)}
                  />
                ))}
              </div>
            ) : null}

            <div className="dp-download">
              <a
                className="dp-download__btn"
                href={dropboxDownloadUrl(page.dropboxUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <DownloadIcon />
                Download all photos
              </a>
            </div>
          </section>
        </>
      )}

      <hr className="dp-divider" />

      <footer className="dp-footer">
        <img src="/logo.png" alt="Every Angle" className="dp-footer__logo" />
      </footer>

      {lightboxIndex != null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          activeIndex={lightboxIndex}
          token={token!}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  );
}
