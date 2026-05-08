import styles from './CategoryFilter.module.css';

const labelFor = (c) =>
  c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1);

export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className={styles.row} role="tablist" aria-label="Filter by category">
      {categories.map((c) => {
        const active = selected === c;
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active}
            className={`${styles.pill} ${active ? styles.active : ''}`}
            onClick={() => onSelect(c)}
          >
            {labelFor(c)}
          </button>
        );
      })}
    </div>
  );
}
