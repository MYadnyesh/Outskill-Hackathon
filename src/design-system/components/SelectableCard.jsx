import { CheckCircle } from '@phosphor-icons/react';
import styles from './SelectableCard.module.css';

/**
 * Radio-style selectable card — the landing mode picker.
 *
 * `tone` picks one of DESIGN.md's saturated brand-card colours. The selected
 * card fills with its tone; unselected cards stay on cream so the choice reads
 * at a glance. Icons are SVG (Phosphor), never emoji — emoji render
 * inconsistently across platforms and carry no accessible name.
 */
export function SelectableCard({ icon: Icon, tone = 'lavender', title, description, selected, onSelect, name }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[styles.card, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      data-tone={tone}
      onClick={onSelect}
      data-group={name}
    >
      <div className={styles.top}>
        {Icon ? <Icon size={26} weight="duotone" className={styles.icon} aria-hidden="true" /> : null}
        {selected ? <CheckCircle weight="fill" size={22} className={styles.check} /> : null}
      </div>
      <span className={styles.title}>{title}</span>
      <span className={styles.desc}>{description}</span>
    </button>
  );
}
