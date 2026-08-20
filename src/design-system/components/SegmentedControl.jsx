import styles from './SegmentedControl.module.css';

/** Segmented control — e.g. the music-style picker (Pop/Rap/Lo-fi/Rock). */
export function SegmentedControl({ options, value, onChange, 'aria-label': ariaLabel }) {
  return (
    <div className={styles.track} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={[styles.option, active ? styles.optionActive : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
