import { Wrench } from '@phosphor-icons/react';
import { IconBadge } from '../../design-system/components/index.js';
import styles from './ComingSoon.module.css';

const COPY = {
  song: {
    title: "This song is still warming up",
    body: "Make a Song mode is being built next — real AI lyrics from this page, plus a real sung track. The shared shell (extraction, error handling, save/share) already works for it.",
    file: 'lib/transforms/song.js',
  },
  kid: {
    title: 'This story is still being written',
    body: 'Explain It to a Kid mode is being built next — a simple explanation, a short story, fun facts, and a quiz for this page. The shared shell already works for it.',
    file: 'lib/transforms/kid.js',
  },
};

/** Placeholder shown for modes that don't have a real AI transform wired up yet. */
export function ComingSoon({ mode }) {
  const copy = COPY[mode] || COPY.song;
  return (
    <div className={styles.card}>
      <IconBadge tone="neutral">
        <Wrench size={20} />
      </IconBadge>
      <div className={styles.title}>{copy.title}</div>
      <p className={styles.body}>{copy.body}</p>
      <span className={styles.mono}>{copy.file}</span>
      <p className={styles.body} style={{ fontSize: 'var(--fs-caption)' }}>
        See docs/FEATURES.md for the full spec and data shape.
      </p>
    </div>
  );
}
