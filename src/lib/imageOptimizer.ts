/**
 * Client-side Image Optimization for AI Vision and Fast Uploads
 * Downscales multi-megapixel photos (e.g. 12-48MP from phones/drones)
 * to ~1500px JPEG, reducing payload from 15MB down to ~150-250KB.
 */
export async function optimizeImageForVision(
  fileOrDataUrl: File | string,
  maxDimension = 1536,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const loadSrc = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Downscale proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: src, mimeType: 'image/jpeg' });
            return;
          }

          // Draw with high quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export as clean compressed JPEG
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64: optimizedDataUrl,
            mimeType: 'image/jpeg'
          });
        } catch (e) {
          console.warn('Canvas image compression notice, using fallback:', e);
          resolve({ base64: src, mimeType: 'image/jpeg' });
        }
      };

      img.onerror = () => {
        resolve({ base64: src, mimeType: 'image/jpeg' });
      };

      img.src = src;
    };

    if (typeof fileOrDataUrl === 'string') {
      loadSrc(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const raw = reader.result as string;
        loadSrc(raw);
      };
      reader.onerror = () => {
        resolve({ base64: '', mimeType: 'image/jpeg' });
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
