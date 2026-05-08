import styles from './Sidebar.module.css';

export const SECTION_GROUPS = [
  {
    label: 'Brand',
    items: [
      { id: 'logo', name: 'Logo' },
      { id: 'colors', name: 'Colors' },
    ],
  },
  {
    label: 'Library',
    items: [
      { id: 'icons', name: 'Icons' },
      { id: 'templates', name: 'Templates' },
      { id: 'photography', name: 'Photography' },
      { id: 'graphics', name: 'Graphics' },
    ],
  },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <nav className={styles.nav} aria-label="Asset sections">
      {SECTION_GROUPS.map((group) => (
        <div key={group.label} className={styles.group}>
          <div className={styles.groupLabel}>{group.label}</div>
          <ul className={styles.list}>
            {group.items.map((item) => {
              const isActive = item.id === active;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                    onClick={() => onSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
