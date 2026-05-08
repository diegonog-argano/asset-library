import IconCard from '../IconCard/IconCard.jsx';
import styles from './IconGrid.module.css';

export default function IconGrid({ assets, totalCount, query, onSelect }) {
  const trimmed = query.trim();
  const countLabel = trimmed
    ? `${assets.length} result${assets.length === 1 ? '' : 's'} for "${trimmed}"`
    : `${totalCount} icon${totalCount === 1 ? '' : 's'}`;

  return (
    <section>
      <div className={styles.meta}>{countLabel}</div>
      {assets.length === 0 ? (
        <div className={styles.empty}>
          <p>No icons match your search.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {assets.map((asset) => (
            <IconCard
              key={asset.id}
              asset={asset}
              onClick={() => onSelect(asset)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
