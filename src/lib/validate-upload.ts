/**
 * The `accept="image/*"` attribute on a file input is a UI hint only — it's
 * trivially bypassed (devtools, a raw request to Supabase Storage), and
 * `file.type` is just the browser's guess from the filename, not a property
 * of the bytes. Buckets are public and served directly, so an attacker-
 * controlled content-type (e.g. `text/html`, `image/svg+xml`) uploaded as a
 * "logo" or "bus photo" could execute as stored XSS when viewed. This sniffs
 * the actual file signature and returns a content-type we trust, rejecting
 * anything that doesn't match a real image (or PDF, where explicitly allowed).
 */

const SIGNATURES: { bytes: number[]; offset?: number; contentType: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], contentType: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], contentType: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38], contentType: 'image/gif' },
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], contentType: 'application/pdf' },
];

function matches(header: Uint8Array, sig: (typeof SIGNATURES)[number]): boolean {
  const offset = sig.offset ?? 0;
  return sig.bytes.every((b, i) => header[offset + i] === b);
}

async function sniffContentType(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  // WebP: "RIFF" .... "WEBP" — the size field in between rules out a fixed
  // byte-array match, so it's checked separately from SIGNATURES.
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp';
  }
  return SIGNATURES.find((sig) => matches(header, sig))?.contentType ?? null;
}

/**
 * Validates a File's actual bytes before it's handed to Supabase Storage.
 * Returns the sniffed, trustworthy content-type to upload with (ignore
 * `file.type`, which is attacker-controlled). Throws if the bytes don't
 * match a real image (or a PDF, when `allowPdf` is set).
 */
export async function validateUploadFile(file: File, { allowPdf = false } = {}): Promise<string> {
  const contentType = await sniffContentType(file);
  if (!contentType || (contentType === 'application/pdf' && !allowPdf)) {
    throw new Error(
      allowPdf ? 'File must be a JPEG, PNG, GIF, WebP image or a PDF.' : 'File must be a JPEG, PNG, GIF or WebP image.',
    );
  }
  return contentType;
}
