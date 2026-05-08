import { useMemo, useState } from 'react';
import palette from '../../data/palette.json';
import sectionStyles from './SectionCommon.module.css';
import styles from './ColorsSection.module.css';

const FAMILY_LABELS = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  neutral: 'Neutral',
};

const FAMILY_ORDER = ['primary', 'secondary', 'accent', 'neutral'];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'accent', label: 'Accent' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'gradient', label: 'Gradients' },
];

// Light backgrounds need a darker check tint when "copied"; dark backgrounds need light.
function isLightHex(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7;
}

export default function ColorsSection({ onToast }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(null); // key of last-copied item

  const q = query.trim().toLowerCase();

  const solidsByFamily = useMemo(() => {
    const groups = new Map();
    for (const family of FAMILY_ORDER) groups.set(family, []);
    for (const c of palette.solids) {
      if (filter !== 'all' && filter !== 'gradient' && c.family !== filter) continue;
      if (filter === 'gradient') continue;
      if (q && !c.name.toLowerCase().includes(q) && !c.hex.toLowerCase().includes(q))
        continue;
      groups.get(c.family).push(c);
    }
    return groups;
  }, [filter, q]);

  const gradients = useMemo(() => {
    if (filter !== 'all' && filter !== 'gradient') return [];
    return palette.gradients.filter(
      (g) => !q || g.name.toLowerCase().includes(q)
    );
  }, [filter, q]);

  const copy = async (value, key, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      onToast?.(`${label} copied`);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    } catch {
      onToast?.('Copy failed');
    }
  };

  const totalShown =
    [...solidsByFamily.values()].reduce((n, arr) => n + arr.length, 0) +
    gradients.length;

  return (
    <section className={sectionStyles.section}>
      <header className={sectionStyles.header}>
        <h1 className={sectionStyles.title}>Colors</h1>
        <p className={sectionStyles.subtitle}>
          Brand palette and gradients. Click a swatch to copy its hex or CSS.
        </p>
      </header>

      <div className={sectionStyles.toolbar}>
        <div className={styles.searchInputWrap}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search colors by name or hex..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search colors"
          />
        </div>
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Filter colors">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.pill} ${active ? styles.pillActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {totalShown === 0 ? (
        <div className={styles.empty}>No colors match.</div>
      ) : (
        <div className={styles.groups}>
          {FAMILY_ORDER.map((family) => {
            const colors = solidsByFamily.get(family);
            if (!colors || colors.length === 0) return null;
            return (
              <div key={family} className={styles.group}>
                <h2 className={styles.groupTitle}>{FAMILY_LABELS[family]}</h2>
                <div className={styles.grid}>
                  {colors.map((c) => {
                    const isLight = isLightHex(c.hex);
                    const isCopied = copied === `solid:${c.hex}`;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        className={styles.card}
                        onClick={() =>
                          copy(c.hex, `solid:${c.hex}`, c.name)
                        }
                        title={`Copy ${c.hex}`}
                      >
                        <div
                          className={`${styles.preview} ${
                            isLight ? styles.previewLight : ''
                          }`}
                          style={{ background: c.hex }}
                        >
                          {isCopied && (
                            <span className={styles.copiedBadge}>Copied</span>
                          )}
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.name}>{c.name}</span>
                          <span className={styles.code}>{c.hex}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {gradients.length > 0 && (
            <div className={styles.group}>
              <h2 className={styles.groupTitle}>Gradients</h2>
              <div className={styles.grid}>
                {gradients.map((g) => {
                  const isCopied = copied === `grad:${g.name}`;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      className={styles.card}
                      onClick={() => copy(g.css, `grad:${g.name}`, g.name)}
                      title="Copy CSS gradient"
                    >
                      <div
                        className={styles.preview}
                        style={{ background: g.css }}
                      >
                        {isCopied && (
                          <span className={styles.copiedBadge}>Copied</span>
                        )}
                      </div>
                      <div className={styles.meta}>
                        <span className={styles.name}>{g.name}</span>
                        <span className={styles.code}>CSS</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
