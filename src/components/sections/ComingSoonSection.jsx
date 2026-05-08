import sectionStyles from './SectionCommon.module.css';
import styles from './ComingSoonSection.module.css';

export default function ComingSoonSection({ title, description, icon }) {
  return (
    <section className={sectionStyles.section}>
      <header className={sectionStyles.header}>
        <h1 className={sectionStyles.title}>{title}</h1>
        {description && (
          <p className={sectionStyles.subtitle}>{description}</p>
        )}
      </header>

      <div className={styles.placeholder}>
        <div className={styles.icon} aria-hidden="true">
          {icon ?? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M12 7v5l3 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <h2 className={styles.title}>Coming soon</h2>
        <p className={styles.body}>
          This section is part of the asset library structure. Drop content
          here when it's ready and the section will activate.
        </p>
      </div>
    </section>
  );
}
