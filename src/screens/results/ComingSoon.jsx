import { Wrench } from '@phosphor-icons/react';
import { IconBadge } from '../../design-system/components/index.js';
import styles from './ComingSoon.module.css';

/**
 * Defensive fallback for a mode with no real AI transform wired up yet.
 * All three shipped modes (tldr/song/kid) have their own content component —
 * this only renders if a future mode is added to VALID_MODES in
 * api/analyze.js before its UI exists.
 */
export function ComingSoon({ mode }) {
  return (
    <div className={styles.card}>
      <IconBadge tone="neutral">
        <Wrench size={20} />
      </IconBadge>
      <div className={styles.title}>This mode is still being built</div>
      <p className={styles.body}>
        {mode ? `"${mode}" mode` : 'This mode'} doesn't have a real AI transform wired up yet. The
        shared shell (extraction, error handling, save/share) already works for it.
      </p>
      <p className={styles.body} style={{ fontSize: 'var(--fs-caption)' }}>
        See docs/FEATURES.md for the full spec and data shape.
      </p>
    </div>
  );
}
