import styles from './IconBadge.module.css';

/** Circular icon/letter badge — site favicons, error state, library items. */
export function IconBadge({ size = 'md', tone = 'accent', children, className = '' }) {
  return (
    <div
      className={[styles.badge, styles[size], tone === 'neutral' ? styles.neutral : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
