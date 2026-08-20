import { CheckCircle } from '@phosphor-icons/react';
import styles from './SelectableCard.module.css';

/** Radio-style selectable card — used for the landing mode picker. */
export function SelectableCard({ emoji, title, description, selected, onSelect, name }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[styles.card, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
      data-group={name}
    >
      <div className={styles.top}>
        <span className={styles.iconEmoji} aria-hidden="true">{emoji}</span>
        {selected ? <CheckCircle weight="fill" size={22} className={styles.check} /> : null}
      </div>
      <span className={styles.title}>{title}</span>
      <span className={styles.desc}>{description}</span>
    </button>
  );
}
