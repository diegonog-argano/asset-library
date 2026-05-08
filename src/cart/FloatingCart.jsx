import { useState } from 'react';
import JSZip from 'jszip';
import { useCart } from './CartContext.jsx';
import { triggerBlobDownload, svgToPngBlob, PNG_SIZE } from '../utils/download.js';
import styles from './FloatingCart.module.css';

export default function FloatingCart({ onToast }) {
  const { items, remove, clear, count } = useCart();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('svg'); // 'svg' | 'png'
  const [busy, setBusy] = useState(false);

  if (count === 0) return null;

  const handleDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (count === 1) {
        const it = items[0];
        if (format === 'svg') {
          const blob = new Blob([it.svg], { type: 'image/svg+xml' });
          triggerBlobDownload(blob, `${it.asset.id}.svg`);
        } else {
          const blob = await svgToPngBlob(it.svg, PNG_SIZE);
          triggerBlobDownload(blob, `${it.asset.id}.png`);
        }
      } else {
        const zip = new JSZip();
        const usedNames = new Map();
        for (const it of items) {
          const baseName = it.asset.id;
          const n = usedNames.get(baseName) ?? 0;
          usedNames.set(baseName, n + 1);
          const safeName = n === 0 ? baseName : `${baseName}-${n + 1}`;
          if (format === 'svg') {
            zip.file(`${safeName}.svg`, it.svg);
          } else {
            const pngBlob = await svgToPngBlob(it.svg, PNG_SIZE);
            zip.file(`${safeName}.png`, pngBlob);
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerBlobDownload(zipBlob, 'icons.zip');
      }
      onToast?.(
        count === 1
          ? `Downloaded ${format.toUpperCase()}`
          : `Downloaded ${count} icons (${format.toUpperCase()})`
      );
      clear();
      setOpen(false);
    } catch (err) {
      console.error(err);
      onToast?.('Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Download cart">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>
              {count} {count === 1 ? 'icon' : 'icons'} ready to download
            </span>
            <div className={styles.panelHeadActions}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => clear()}
              >
                Clear all
              </button>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Close downloads"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <ul className={styles.list}>
            {items.map((it) => (
              <li key={it.key} className={styles.item}>
                <span
                  className={styles.thumb}
                  dangerouslySetInnerHTML={{ __html: it.svg }}
                  aria-hidden="true"
                />
                <span className={styles.itemName}>{it.asset.name}</span>
                <span className={styles.itemColor}>{it.color}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => remove(it.key)}
                  aria-label={`Remove ${it.asset.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.formatRow}>
            <span className={styles.formatLabel}>Format</span>
            <div className={styles.toggle} role="radiogroup" aria-label="Download format">
              <button
                type="button"
                role="radio"
                aria-checked={format === 'svg'}
                className={`${styles.toggleBtn} ${
                  format === 'svg' ? styles.toggleActive : ''
                }`}
                onClick={() => setFormat('svg')}
              >
                SVG
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={format === 'png'}
                className={`${styles.toggleBtn} ${
                  format === 'png' ? styles.toggleActive : ''
                }`}
                onClick={() => setFormat('png')}
              >
                PNG
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={busy}
          >
            {!busy && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {busy
              ? 'Preparing…'
              : count === 1
              ? `Download ${format.toUpperCase()}`
              : `Download ${count} as ZIP`}
          </button>
        </div>
      )}

      <button
        type="button"
        className={styles.bubble}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${count} icons ready to download`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.bubbleLabel}>Download Ready</span>
        <span className={styles.bubbleCount}>{count}</span>
      </button>
    </div>
  );
}
