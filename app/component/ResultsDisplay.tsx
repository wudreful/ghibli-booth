'use client';

import { useCallback, type JSX } from 'react';
import Image from 'next/image';
import QRCode from 'react-qr-code';

interface Props {
  shotId:   string;
  photoUrl: string;
  onRetake: () => void;
}

function guestUrl(shotId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/result/${shotId}`;
}

export default function ResultsDisplay({ shotId, photoUrl, onRetake }: Props): JSX.Element {
  const qrValue = guestUrl(shotId);

  const handleDownload = useCallback(async () => {
    try {
      const res  = await fetch(`/api/download?url=${encodeURIComponent(photoUrl)}`);
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `ghibli-${shotId.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { window.open(photoUrl, '_blank'); }
  }, [photoUrl, shotId]);

  return (
    <div className="result" role="main">
      <div className="result__bar">
        <span className="result__eyebrow">Your scene is ready</span>
        <button className="result__retake" onClick={onRetake}>New photo →</button>
      </div>
      <div className="result__body">
        <div className="result__photo-wrap">
          <Image className="result__photo" src={photoUrl} alt="Your Ghibli-styled photo" width={1080} height={720} priority unoptimized />
        </div>
        <div className="result__sheet">
          <h1 className="result__title">Your moment,<br />painted.</h1>
          <div className="qr-card">
            <div className="qr-canvas-wrap">
              <QRCode value={qrValue} size={98} level="H" style={{ display: 'block' }} />
            </div>
            <div className="qr-info">
              <p className="qr-info__label">Scan to save</p>
              <p className="qr-info__title">Take it with you</p>
              <p className="qr-info__sub">Scan with your phone to download your Ghibli scene.</p>
            </div>
          </div>
          <button className="btn-dl" onClick={handleDownload}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" />
            </svg>
            Save to device
          </button>
        </div>
      </div>
    </div>
  );
}
