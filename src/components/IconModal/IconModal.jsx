import { useEffect, useMemo, useState } from 'react';
import { applyColorToSvg, isValidHex } from '../../utils/svgColor.js';
import { useCart } from '../../cart/CartContext.jsx';
import EditMetadata from './EditMetadata.jsx';
import styles from './IconModal.module.css';

const ICON_BASE = `${import.meta.env.BASE_URL}icons/`;

// Argano brand palette: primary, secondary family, then specialty accents.
const SWATCHES = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Primary orange', hex: '#ff5c00' },
  { name: 'Orange shade', hex: '#ec5723' },
  { name: 'Orange tint 2', hex: '#ff8f00' },
  { name: 'Orange tint 1', hex: '#f8d648' },
  { name: 'Blue shade', hex: '#111e6a' },
  { name: 'Blue tint', hex: '#9ed2ff' },
  { name: 'Sand shade', hex: '#b0a099' },
  { name: 'Sand', hex: '#f2e6dd' },
  { name: 'Sand tint 1', hex: '#fff5ed' },
  { name: 'Indigo', hex: '#5a0def' },
  { name: 'Magenta', hex: '#ff2e84' },
  { name: 'Electric blue', hex: '#191bff' },
  { name: 'Turquoise', hex: '#0d8bbc' },
];

export default function IconModal({ asset, onClose, onToast, onSaveMetadata }) {
  const [rawSvg, setRawSvg] = useState('');
  const [color, setColor] = useState('#000000');
  const [hexInput, setHexInput] = useState('#000000');
  const [editing, setEditing] = useState(false);
  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    fetch(`${ICON_BASE}${asset.filename}`)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRawSvg(text);
      })
      .catch(() => {
        if (!cancelled) setRawSvg('');
      });
    return () => {
      cancelled = true;
    };
  }, [asset.filename]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const coloredSvg = useMemo(
    () => (rawSvg ? applyColorToSvg(rawSvg, color) : ''),
    [rawSvg, color]
  );

  const hexValid = isValidHex(hexInput);
  const inCart = cart.has(asset.id, color);

  const handleSwatchClick = (c) => {
    setColor(c);
    setHexInput(c);
  };

  const handleHexChange = (e) => {
    const next = e.target.value;
    setHexInput(next);
    if (isValidHex(next)) setColor(next.toLowerCase());
  };

  const handleCopy = async () => {
    if (!coloredSvg) return;
    try {
      await navigator.clipboard.writeText(coloredSvg);
      onToast('SVG copied to clipboard');
    } catch {
      onToast('Copy failed');
    }
  };

  const handleAddToCart = () => {
    cart.add(asset, color, coloredSvg);
    onToast(inCart ? 'Already in Downloads' : 'Added to Downloads');
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${asset.name} details`}
    >
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          className={styles.preview}
          dangerouslySetInnerHTML={{ __html: coloredSvg }}
        />

        {editing && import.meta.env.DEV ? (
          <EditMetadata
            asset={asset}
            onCancel={() => setEditing(false)}
            onSaved={(patch) => {
              onSaveMetadata?.(asset.id, patch);
              setEditing(false);
              onToast('Metadata saved');
            }}
            onError={(msg) => onToast(msg)}
          />
        ) : (
          <>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>{asset.name}</h2>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  className={styles.editLink}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              )}
            </div>
            <div className={styles.keywords}>
              {asset.keywords.map((k) => (
                <span key={k} className={styles.chip}>
                  {k}
                </span>
              ))}
            </div>
          </>
        )}

        <div className={styles.colorSection}>
          <div className={styles.colorLabel}>Color</div>
          <div className={styles.colorRow}>
            <div className={styles.swatches} role="radiogroup" aria-label="Color swatches">
              {SWATCHES.map((c) => {
                const active = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${c.name} ${c.hex}`}
                    title={`${c.name} · ${c.hex}`}
                    className={`${styles.swatch} ${active ? styles.swatchActive : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => handleSwatchClick(c.hex)}
                  />
                );
              })}
            </div>
            <div className={styles.hexWrap}>
              <span
                className={styles.hexPreview}
                style={{ background: hexValid ? hexInput : color }}
                aria-hidden="true"
              />
              <input
                type="text"
                className={`${styles.hexInput} ${
                  !hexValid ? styles.hexInputInvalid : ''
                }`}
                value={hexInput}
                onChange={handleHexChange}
                spellCheck="false"
                aria-label="Hex color value"
                aria-invalid={!hexValid}
              />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleCopy}
          >
            Copy SVG code
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            onClick={handleAddToCart}
            disabled={inCart}
          >
            {inCart ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {inCart ? 'In Downloads' : 'Add to Downloads'}
          </button>
        </div>
      </div>
    </div>
  );
}
