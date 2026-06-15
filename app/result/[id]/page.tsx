'use client';

import { useEffect, useState, type JSX } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Shot { id: string; photo_url: string; status: string; }

export default function GuestResultPage({ params }: { params: { id: string } }): JSX.Element {
  const { id } = params;
  const [shot,  setShot]  = useState<Shot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let channel: ReturnType<typeof sb.channel> | null = null;
    async function load() {
      const { data, error: err } = await sb
        .from('shots').select('id, photo_url, status').eq('id', id).single();
      if (err || !data) { setError('Photo not found. The link may have expired.'); return; }
      if (data.status === 'done' && data.photo_url) { setShot(data as Shot); return; }
      channel = sb.channel(`shot-${id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'shots', filter: `id=eq.${id}` },
          (payload) => {
            const u = payload.new as Shot;
            if (u.status === 'done' && u.photo_url) { setShot(u); channel?.unsubscribe(); }
          })
        .subscribe();
    }
    load();
    return () => { channel?.unsubscribe(); };
  }, [id]);

  async function handleDownload() {
    if (!shot) return;
    try {
      const res  = await fetch(`/api/download?url=${encodeURIComponent(shot.photo_url)}`);
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `ghibli-${shot.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch { window.open(shot.photo_url, '_blank'); }
  }

  return (
    <div className="guest-page">
      <p className="guest-page__brand">GhibliBooth</p>
      {error && <p className="guest-page__error">{error}</p>}
      {!error && !shot && (
        <>
          <div className="aperture" style={{ marginTop: 40 }} aria-hidden>
            <div className="aperture__ring aperture__ring--a" />
            <div className="aperture__ring aperture__ring--b" />
            <div className="aperture__ring aperture__ring--c" />
          </div>
          <p className="guest-page__loading">Your scene is being painted</p>
        </>
      )}
      {shot && (
        <>
          <div className="guest-page__photo">
            <Image src={shot.photo_url} alt="Your Ghibli photo" width={1080} height={720} style={{ width:'100%', height:'auto' }} priority unoptimized />
          </div>
          <h1 className="guest-page__title">Your moment, painted.</h1>
          <p className="guest-page__sub">Save this to your camera roll and share the magic.</p>
          <button className="btn-dl" onClick={handleDownload}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3v13M7 11l5 5 5-5" /><path d="M5 21h14" />
            </svg>
            Save to camera roll
          </button>
        </>
      )}
    </div>
  );
}
