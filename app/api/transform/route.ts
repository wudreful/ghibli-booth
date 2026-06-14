import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_BYTES     = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    let form: FormData;
    try { form = await req.formData(); }
    catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

    const file = form.get('image');
    if (!(file instanceof Blob))
      return NextResponse.json({ error: 'Missing image.' }, { status: 400 });
    if (file.size === 0 || file.size > MAX_BYTES)
      return NextResponse.json({ error: 'Invalid image size. Max 5MB.' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Invalid image type.' }, { status: 400 });

    const workerUrl    = process.env.WORKER_URL;
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerUrl)
      return NextResponse.json({ error: 'Worker not configured.' }, { status: 500 });

    const upstream = new FormData();
    upstream.append('image', file, 'photo.jpg');

    let workerRes: Response;
    try {
      workerRes = await fetch(`${workerUrl}/transform`, {
        method:  'POST',
        headers: workerSecret ? { 'x-api-key': workerSecret } : {},
        body:    upstream,
        signal:  AbortSignal.timeout(60_000),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      return NextResponse.json(
        { error: isTimeout ? 'Worker timed out.' : 'Worker unreachable.' },
        { status: isTimeout ? 504 : 502 },
      );
    }

    if (workerRes.status === 429)
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    if (!workerRes.ok)
      return NextResponse.json({ error: `Processing failed (${workerRes.status}).` }, { status: 502 });

    const result = await workerRes.json() as { shotId?: string; photoUrl?: string };
    if (!result.shotId || !result.photoUrl)
      return NextResponse.json({ error: 'Invalid worker response.' }, { status: 502 });

    return NextResponse.json({ shotId: result.shotId, photoUrl: result.photoUrl });
  } catch (err) {
    console.error('[transform]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
