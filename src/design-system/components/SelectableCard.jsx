import { useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import styles from './SelectableCard.module.css';

/**
 * Radio-style selectable card — the landing mode picker.
 *
 * `art` is an illustrated button face that already contains the mode's name.
 * If it fails to load (not added yet, bad path) the card falls back to the
 * icon + text layout, so the picker is never broken by a missing asset.
 *
 * Accessibility: when the artwork renders it carries alt="" because the label
 * it shows is duplicated as visually-hidden text — otherwise a screen reader
 * would hear the mode name twice.
 */
export function SelectableCard({
  icon: Icon,
  art,
  tone = 'lavender',
  title,
  description,
  selected,
  onSelect,
  name,
}) {
  const [artFailed, setArtFailed] = useState(false);
  const showArt = Boolean(art) && !artFailed;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[styles.card, showArt ? styles.cardArt : '', selected ? styles.selected : '']
        .filter(Boolean)
        .join(' ')}
      data-tone={tone}
      onClick={onSelect}
      data-group={name}
    >
      {showArt ? (
        <>
          <img
            className={styles.art}
            src={art}
            alt=""
            loading="lazy"
            onError={() => setArtFailed(true)}
          />
          <span className="visually-hidden">{title}</span>
        </>
      ) : (
        <>
          <div className={styles.top}>
            {Icon ? <Icon size={26} weight="duotone" className={styles.icon} aria-hidden="true" /> : null}
          </div>
          <span className={styles.title}>{title}</span>
        </>
      )}

      <span className={styles.desc}>{description}</span>
      {selected ? <CheckCircle weight="fill" size={22} className={styles.check} /> : null}
    </button>
  );
}
