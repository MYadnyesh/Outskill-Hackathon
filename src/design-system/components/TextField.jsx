import { forwardRef } from 'react';
import styles from './TextField.module.css';

/** Text input + form field wrapper — label, leading icon, hint text. */
export const TextField = forwardRef(function TextField(
  { label, icon = null, hint, className = '', inputClassName = '', ...rest },
  ref
) {
  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {label ? <label className={styles.label}>{label}</label> : null}
      <div className={styles.inputRow}>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
        <input ref={ref} className={[styles.input, inputClassName].filter(Boolean).join(' ')} {...rest} />
      </div>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
});
