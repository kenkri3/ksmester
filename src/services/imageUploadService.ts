/**
 * Tjeneste for automatisk opplasting og WebP-komprimering til Railway Volume
 */
export interface UploadResult {
  success: boolean;
  url: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  format: string;
}

export async function uploadAndCompressImage(fileOrBase64: File | string): Promise<UploadResult> {
  if (typeof fileOrBase64 === 'string') {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: fileOrBase64 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Feil ved opplasting av bilde');
    }
    return res.json();
  } else {
    const formData = new FormData();
    formData.append('file', fileOrBase64);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Feil ved opplasting av bilde');
    }
    return res.json();
  }
}
