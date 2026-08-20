import styles from './Card.module.css';

/**
 * Shared Card — optional kicker/title/body/meta slots, 3 elevation levels.
 * Pass `children` for fully custom card content instead of the slot props.
 */
export function Card({ elevation = 1, kicker, title, body, meta, children, className = '', ...rest }) {
  const elevationClass = styles[`elevation${elevation}`] || styles.elevation1;
  return (
    <div className={[styles.card, elevationClass, className].filter(Boolean).join(' ')} {...rest}>
      {kicker ? <div className={styles.kicker}>{kicker}</div> : null}
      {title ? <div className={styles.title}>{title}</div> : null}
      {body ? <div className={styles.body}>{body}</div> : null}
      {children}
      {meta ? <div className={styles.meta}>{meta}</div> : null}
    </div>
  );
}
