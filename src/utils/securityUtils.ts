import { PlatformSettings } from '../types';

const ALLOWED_IMAGE_DATA_PREFIXES = [
  'data:image/png;base64,',
  'data:image/jpeg;base64,',
  'data:image/jpg;base64,',
  'data:image/webp;base64,',
  'data:image/gif;base64,'
];

const ALLOWED_PDF_DATA_PREFIX = 'data:application/pdf;base64,';

/**
 * Validates media or proof URLs strictly before rendering in <img>, <video>, or <a>.
 * Blocks javascript:, vbscript:, data:text/html, data:image/svg+xml, and malformed URIs.
 */
export function sanitizeMediaUrl(
  rawUrl: string | undefined | null,
  options: { allowPdfData?: boolean } = {}
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Explicit dangerous scheme blocklist
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/') ||
    lower.startsWith('data:image/svg') ||
    lower.startsWith('data:application/xhtml')
  ) {
    return null;
  }

  // Safe base64 image data URIs
  if (ALLOWED_IMAGE_DATA_PREFIXES.some(prefix => lower.startsWith(prefix))) {
    return trimmed;
  }

  // Safe base64 PDF data URI (when explicitly permitted, e.g. payment proof viewer)
  if (options.allowPdfData && lower.startsWith(ALLOWED_PDF_DATA_PREFIX)) {
    return trimmed;
  }

  // Safe blob URLs created in-origin
  if (lower.startsWith('blob:')) {
    return trimmed;
  }

  // Allow relative local paths (e.g., /assets/...)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Strictly parse HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Validates external clickable navigation URLs (HTTPS/HTTP only).
 */
export function isSafeExternalUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Safely opens or downloads a validated PDF proof (converts base64 data URI into a Blob URL
 * instead of navigating directly to a raw data: URI).
 */
export function openSafePdfProof(
  rawUrl: string | undefined | null,
  fileName = 'comprovativo.pdf'
): boolean {
  const safeUrl = sanitizeMediaUrl(rawUrl, { allowPdfData: true });
  if (!safeUrl) return false;

  const lower = safeUrl.toLowerCase();
  if (lower.startsWith(ALLOWED_PDF_DATA_PREFIX)) {
    try {
      const base64Part = safeUrl.slice(ALLOWED_PDF_DATA_PREFIX.length);
      const binaryString = atob(base64Part);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'comprovativo.pdf';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    } catch {
      return false;
    }
  }

  if (isSafeExternalUrl(safeUrl)) {
    const link = document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  return false;
}

/**
 * Strips plaintext secrets (password, adminPin, otpCode) before holding records in browser memory or localStorage.
 */
export function stripSensitiveFields<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  const copy: Record<string, any> = { ...record };
  delete copy.password;
  delete copy.adminPin;
  delete copy.otpCode;
  return copy as T;
}

/**
 * Removes adminPin or legacy secret fields from PlatformSettings.
 */
export function sanitizePlatformSettings(settings: PlatformSettings): PlatformSettings {
  if (!settings || typeof settings !== 'object') return settings;
  const { adminPin: _removedPin, ...clean } = settings as PlatformSettings & { adminPin?: string };
  return clean;
}

/**
 * Computes a deterministic SHA-256 hex digest for privacy-preserving deduplication
 * (e.g. single free-trial verification by normalized phone/email/document).
 */
export async function computeSha256Hex(rawValue: string): Promise<string> {
  const normalized = (rawValue || '').trim().toLowerCase();
  if (!normalized) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
      const encoded = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic hash below
  }
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

