// Turns a photo picked from the phone into a small base64 data-URL that can
// be stored in localStorage and shown offline. Resized to ≤512px wide and
// JPEG-compressed to ~30–60 KB: localStorage only holds ~5 MB on iPhone and
// a full store silently loses edits, so photos must stay small.
export function fileToDataUrl(file: File, maxWidth = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
