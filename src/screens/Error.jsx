import { LinkBreak, ArrowLeft } from '@phosphor-icons/react';
import { IconBadge, Button } from '../design-system/components/index.js';
import { EXAMPLE_URLS } from '../api/client.js';
import { useAppState } from '../state/AppState.jsx';
import styles from './Error.module.css';

export function ErrorScreen() {
  const { state, resetToLanding, startTransform } = useAppState();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <IconBadge size="lg" tone="neutral">
          <LinkBreak size={30} weight="regular" />
        </IconBadge>
        <h1 className={styles.heading}>We couldn't read that page.</h1>
        <p className={styles.body}>
          The link might be broken, private, or blocking automated readers. Try a different URL, or one of these:
        </p>

        <div className={styles.chipsRow}>
          {EXAMPLE_URLS.filter((e) => !e.isBrokenDemo).map((example) => (
            <button
              key={example.url}
              type="button"
              className={styles.chip}
              onClick={() => startTransform(example.url, state.selectedMode)}
            >
              {example.label}
            </button>
          ))}
        </div>

        {state.error?.message ? <p className={styles.code}>Details: {state.error.message}</p> : null}

        <Button variant="primary" icon={<ArrowLeft size={18} weight="bold" />} iconPosition="left" onClick={resetToLanding}>
          Try again
        </Button>
      </div>
    </div>
  );
}
