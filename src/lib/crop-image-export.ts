import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Failed to load image')));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/** Export cropped region to JPEG blob at fixed output dimensions. */
export async function exportCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      },
      'image/jpeg',
      0.92,
    );
  });
}
