// Browser download + SVG→PNG canvas rendering helpers.

export const PNG_SIZE = 256;

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Read aspect ratio from an SVG string. Tries viewBox first, then width/height.
function svgAspect(svgString) {
  const vb = svgString.match(/<svg\b[^>]*\bviewBox="([^"]+)"/i);
  if (vb) {
    const [, , w, h] = vb[1].split(/\s+/).map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  const wm = svgString.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)/i);
  const hm = svgString.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)/i);
  if (wm && hm) {
    const w = parseFloat(wm[1]);
    const h = parseFloat(hm[1]);
    if (w > 0 && h > 0) return w / h;
  }
  return 1;
}

/**
 * Render an SVG string to a PNG Blob.
 * @param {string} svgString - the SVG markup
 * @param {number|object} options
 *   - number: square size (legacy form, used for icon exports)
 *   - { size }: same as passing a number
 *   - { longEdge }: target the long edge; the other dim follows the SVG's aspect ratio
 *   - { width, height }: explicit dimensions
 */
export function svgToPngBlob(svgString, options = PNG_SIZE) {
  let targetW;
  let targetH;
  if (typeof options === 'number') {
    targetW = targetH = options;
  } else if (options.width && options.height) {
    targetW = options.width;
    targetH = options.height;
  } else if (options.longEdge) {
    const aspect = svgAspect(svgString);
    if (aspect >= 1) {
      targetW = options.longEdge;
      targetH = Math.round(options.longEdge / aspect);
    } else {
      targetH = options.longEdge;
      targetW = Math.round(options.longEdge * aspect);
    }
  } else {
    targetW = targetH = options.size ?? PNG_SIZE;
  }

  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('toBlob returned null'));
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
