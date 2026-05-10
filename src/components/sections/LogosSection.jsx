import { useMemo, useState } from 'react';
import logos from '../../data/logos.json';
import { useCart } from '../../cart/CartContext.jsx';
import {
  triggerBlobDownload,
  svgToPngBlob,
} from '../../utils/download.js';
import sectionStyles from './SectionCommon.module.css';
import styles from './LogosSection.module.css';

const LOGO_BASE = `${import.meta.env.BASE_URL}logos/`;
const PNG_LONG_EDGE = 1024;

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'logomark', label: 'Logomark' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
];

// Logos with light foregrounds need a dark preview backdrop.
function previewBgFor(color) {
  return color === 'white' || color === 'inverse' ? 'dark' : 'light';
}

async function fetchSvg(filename) {
  const res = await fetch(`${LOGO_BASE}${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}`);
  return res.text();
}

export default function LogosSection({ onToast }) {
  const [type, setType] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const cart = useCart();

  const filtered = useMemo(
    () => (type === 'all' ? logos : logos.filter((l) => l.logoType === type)),
    [type]
  );

  const handleSvg = async (logo) => {
    if (busyId) return;
    setBusyId(`${logo.id}:svg`);
    try {
      const svg = await fetchSvg(logo.filename);
      triggerBlobDownload(
        new Blob([svg], { type: 'image/svg+xml' }),
        `${logo.id}.svg`
      );
    } catch (err) {
      console.error(err);
      onToast?.('SVG download failed');
    } finally {
      setBusyId(null);
    }
  };

  const handlePng = async (logo) => {
    if (busyId) return;
    setBusyId(`${logo.id}:png`);
    try {
      const svg = await fetchSvg(logo.filename);
      const blob = await svgToPngBlob(svg, { longEdge: PNG_LONG_EDGE });
      triggerBlobDownload(blob, `${logo.id}.png`);
    } catch (err) {
      console.error(err);
      onToast?.('PNG download failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddToCart = async (logo) => {
    if (busyId) return;
    setBusyId(`${logo.id}:cart`);
    try {
      const svg = await fetchSvg(logo.filename);
      cart.add(logo, logo.color, svg);
      onToast?.(`Added ${logo.name} to Downloads`);
    } catch (err) {
      console.error(err);
      onToast?.('Add failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={sectionStyles.section}>
      <header className={sectionStyles.header}>
        <h1 className={sectionStyles.title}>Logo</h1>
        <p className={sectionStyles.subtitle}>
          Argano logo variants — Logomark, Horizontal, and Vertical lockups in
          Full color, Black, White, and Inverse. Download SVG (vector) or PNG
          (transparent, 1024 px long edge).
        </p>
      </header>

      <div className={styles.filterRow} role="tablist" aria-label="Logo type">
        {TYPE_FILTERS.map((f) => {
          const active = type === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.pill} ${active ? styles.pillActive : ''}`}
              onClick={() => setType(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className={styles.grid}>
        {filtered.map((logo) => {
          const bgKind = previewBgFor(logo.color);
          const inCart = cart.has(logo.id, logo.color);
          return (
            <div key={logo.id} className={styles.card}>
              <div
                className={`${styles.preview} ${
                  bgKind === 'dark' ? styles.previewDark : styles.previewLight
                }`}
              >
                <img
                  src={`${LOGO_BASE}${logo.filename}`}
                  alt={logo.name}
                  className={styles.logoImg}
                  draggable={false}
                />
              </div>
              <div className={styles.meta}>
                <div className={styles.name}>{logo.name}</div>
                <div className={styles.dim}>
                  {logo.width
                    ? `${Math.round(logo.width)} × ${Math.round(logo.height)}`
                    : ''}
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handleSvg(logo)}
                  disabled={busyId === `${logo.id}:svg`}
                >
                  SVG
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handlePng(logo)}
                  disabled={busyId === `${logo.id}:png`}
                >
                  PNG
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionPrimary}`}
                  onClick={() => handleAddToCart(logo)}
                  disabled={inCart || busyId === `${logo.id}:cart`}
                  aria-label={`Add ${logo.name} to Downloads`}
                >
                  {inCart ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
