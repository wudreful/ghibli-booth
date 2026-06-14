'use client';

import type { JSX } from 'react';

export default function LoadingScreen(): JSX.Element {
  return (
    <div className="proc" role="status" aria-live="polite">
      <div className="aperture" aria-hidden>
        <div className="aperture__ring aperture__ring--a" />
        <div className="aperture__ring aperture__ring--b" />
        <div className="aperture__ring aperture__ring--c" />
      </div>
      <p className="proc__label">Painting</p>
      <p className="proc__sub">Your scene is almost ready</p>
    </div>
  );
}
