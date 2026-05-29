// ============================================================
// photo-utils.js — v13 (Faz 6.C: değişiklik yok)
// ============================================================

export function compressImage(file, options = {}) {
  const { maxSize = 1200, quality = 0.75 } = options;
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Geçersiz dosya tipi: ' + file.type));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Resim yüklenemedi'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) { reject(err); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function base64Size(base64) {
  const data = base64.split(',')[1] || base64;
  return Math.floor((data.length * 3) / 4);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
