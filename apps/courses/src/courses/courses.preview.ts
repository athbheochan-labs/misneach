import { createHmac, timingSafeEqual } from 'crypto';

type PreviewPayload = {
  releaseId: string;
  actorUserId: number;
  role: 'admin';
  exp: number;
};

function b64url(input: string | Uint8Array): string {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf-8') : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4 || 4)) % 4);
  const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function signRaw(payloadB64: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payloadB64).digest());
}

export function signPreviewToken(
  input: { releaseId: string; actorUserId: number; ttlSec: number },
  secret: string,
): string {
  const payload: PreviewPayload = {
    releaseId: input.releaseId,
    actorUserId: input.actorUserId,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + Math.max(30, input.ttlSec),
  };

  const payloadB64 = b64url(JSON.stringify(payload));
  const signature = signRaw(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export function verifyPreviewToken(
  token: string,
  secret: string,
): PreviewPayload | null {
  const [payloadB64, providedSig] = String(token || '').split('.');
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = signRaw(payloadB64, secret);
  const left = Buffer.from(providedSig);
  const right = Buffer.from(expectedSig);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;

  let payload: PreviewPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64)) as PreviewPayload;
  } catch {
    return null;
  }

  if (!payload || payload.role !== 'admin') return null;
  if (!payload.releaseId || !Number.isFinite(Number(payload.actorUserId))) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
