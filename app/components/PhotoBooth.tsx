'use client';

import { useRef, useState, useCallback, useEffect, type JSX } from 'react';

interface Props { onCapture: (blob: Blob) => void; }

export default function PhotoBooth({ onCapture }: Props): JSX.Element {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<'pending'|'ok'|'blocked'>('pending');
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCamState('ok');
      } catch { setCamState('blocked'); }
    }
    start();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const captureBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const vid = videoRef.current;
      const cvs = canvasRef.current;
      if (!vid || !cvs) return reject(new Error('No video'));
      cvs.width  = vid.videoWidth  || 1280;
      cvs.height = vid.videoHeight || 720;
      const ctx = cvs.getContext('2d');
      if (!ctx) return reject(new Error('No context'));
      ctx.save();
      ctx.translate(cvs.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(vid, 0, 0);
      ctx.restore();
      cvs.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
    });
  }, []);

  const handleShutter = useCallback(async () => {
    setFlashing(true);
    try {
      const blob = await captureBlob();
      setTimeout(() => setFlashing(false), 400);
      onCapture(blob);
    } catch { setFlashing(false); }
  }, [captureBlob, onCapture]);

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden />
      <div className={`flash${flashing ? ' flash--on' : ''}`} aria-hidden />
      <div className="vf" role="main">
        <video ref={videoRef} className="vf__video" autoPlay playsInline muted />
        <div className="vf__vignette" aria-hidden />
        <div className="vf__hud" aria-hidden>
          <span className="brand">
            Ghibli<span className="brand__accent">Booth</span>
            <span className="live-dot" />
          </span>
        </div>
        <div className="vf__corners" aria-hidden><div className="vf__corners-b" /></div>
        {camState === 'blocked' && (
          <div className="vf__blocked" role="alert">
            <div className="vf__blocked-icon" aria-hidden>⚠</div>
            <p>Camera access is required.<br />Allow it in Safari settings, then reload.</p>
          </div>
        )}
        {camState !== 'blocked' && (
          <div className="vf__controls">
            <span className="vf__hint" aria-hidden>Tap to capture</span>
            <button className="shutter" aria-label="Take photo" onClick={handleShutter} disabled={camState !== 'ok'} />
          </div>
        )}
      </div>
    </>
  );
}
