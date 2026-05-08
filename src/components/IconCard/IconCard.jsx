import styles from './IconCard.module.css';

const ICON_BASE = `${import.meta.env.BASE_URL}icons/`;

export default function IconCard({ asset, onClick }) {
  const visibleKeywords = asset.keywords.slice(0, 3);
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.preview}>
        <img
          src={`${ICON_BASE}${asset.filename}`}
          alt={asset.name}
          className={styles.svg}
          loading="lazy"
          draggable={false}
        />
      </div>
      <div className={styles.name}>{asset.name}</div>
      {visibleKeywords.length > 0 && (
        <div className={styles.keywords}>
          {visibleKeywords.map((k) => (
            <span key={k} className={styles.chip}>
              {k}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
