import styles from './Pill.module.css';

/** Tag/pill — variants: 'accent' | 'neutral' | 'outline'. */
export function Pill({ variant = 'neutral', icon = null, children, className = '' }) {
  return (
    <span className={[styles.pill, styles[variant], className].filter(Boolean).join(' ')}>
      {icon}
      {children}
    </span>
  );
}
