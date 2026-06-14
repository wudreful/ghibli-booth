'use client';

import { useState, useCallback, type JSX } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen  from './LoadingScreen';
import ResultsDisplay from './ResultsDisplay';

const PhotoBooth = dynamic(() => import('./PhotoBooth'), { ssr: false });

type Screen = 'viewfinder' | 'processing' | 'result';

export default function BoothShell(): JSX.Element {
  const [screen,   setScreen]   = useState<Screen>('viewfinder');
  const [shotId,   setShotId]   = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [toast,    setToast]    = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  }, []);

  const handleCapture = useCallback(async (blob: Blob) => {
    setScreen('processing');
    try {
      const form = new FormData();
      form.append('image', blob, 'photo.jpg');

      const res = await fetch('/api/transform', { method: 'POST', body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const { shotId: id, photoUrl: url } = await res.json() as {
        shotId: string;
        photoUrl: string;
      };

      setShotId(id);
      setPhotoUrl(url);
      setScreen('result');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong.');
      setScreen('viewfinder');
    }
  }, [showToast]);

  const handleRetake = useCallback(() => {
    setShotId('');
    setPhotoUrl('');
    setScreen('viewfinder');
  }, []);

  return (
    <>
      {screen === 'viewfinder' && <PhotoBooth onCapture={handleCapture} />}
      {screen === 'processing'  && <LoadingScreen />}
      {screen === 'result' && shotId && photoUrl && (
        <ResultsDisplay shotId={shotId} photoUrl={photoUrl} onRetake={handleRetake} />
      )}
      <div className={`toast${toast ? ' toast--show' : ''}`} role="alert" aria-live="assertive">
        {toast}
      </div>
    </>
  );
}
