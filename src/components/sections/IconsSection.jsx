import { useMemo, useState } from 'react';
import iconsData from '../../data/icons.json';
import SearchBar from '../SearchBar/SearchBar.jsx';
import CategoryFilter from '../CategoryFilter/CategoryFilter.jsx';
import IconGrid from '../IconGrid/IconGrid.jsx';
import IconModal from '../IconModal/IconModal.jsx';
import styles from './SectionCommon.module.css';

export default function IconsSection({ onToast }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [overrides, setOverrides] = useState({});

  const assets = useMemo(
    () =>
      iconsData.map((a) =>
        overrides[a.id] ? { ...a, ...overrides[a.id] } : a
      ),
    [overrides]
  );

  const categories = useMemo(() => {
    const set = new Set(assets.map((a) => a.category));
    return ['all', ...Array.from(set).sort()];
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false;
      if (!q) return true;
      if (asset.name.toLowerCase().includes(q)) return true;
      return asset.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [assets, query, category]);

  const handleSaveMetadata = (id, patch) => {
    setOverrides((curr) => ({ ...curr, [id]: { ...curr[id], ...patch } }));
    if (selectedIcon?.id === id) {
      setSelectedIcon((curr) => ({ ...curr, ...patch }));
    }
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h1 className={styles.title}>Icons</h1>
        <p className={styles.subtitle}>
          Brand-approved icon set. Pick a color, add to Downloads, export
          individually or as a batch.
        </p>
      </header>

      <div className={styles.toolbar}>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <CategoryFilter
        categories={categories}
        selected={category}
        onSelect={setCategory}
      />

      <IconGrid
        assets={filtered}
        totalCount={assets.length}
        query={query}
        onSelect={setSelectedIcon}
      />

      {selectedIcon && (
        <IconModal
          asset={selectedIcon}
          onClose={() => setSelectedIcon(null)}
          onToast={onToast}
          onSaveMetadata={handleSaveMetadata}
        />
      )}
    </section>
  );
}
