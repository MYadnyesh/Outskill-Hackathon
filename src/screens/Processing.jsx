import { useEffect, useState } from 'react';
import { CircleNotch, CheckCircle } from '@phosphor-icons/react';
import styles from './Processing.module.css';

const FINAL_STEP_BY_MODE = {
  tldr: 'Creating your TL;DR summary…',
  song: 'Creating your song…',
  kid: 'Creating your kids story…',
};

const BASE_STEPS = ['Reading the page…', 'Understanding the content…', 'Finding the important bits…'];

const STEP_INTERVAL_MS = 700;
const PROGRESS_BY_STEP = [22, 48, 74, 92];

export function Processing({ mode }) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [...BASE_STEPS, FINAL_STEP_BY_MODE[mode] || FINAL_STEP_BY_MODE.tldr];

  useEffect(() => {
    setStepIndex(0);
    const timers = [1, 2, 3].map((i) => setTimeout(() => setStepIndex(i), i * STEP_INTERVAL_MS));
    return () => timers.forEach(clearTimeout);
    // mode change means a fresh run — restart the sequence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className={styles.page}>
      <div className={styles.column}>
        <div className={styles.ringWrap}>
          <CircleNotch size={44} weight="bold" className={styles.spin} />
        </div>
        <h1 className={styles.headline}>Transforming your website…</h1>

        <div className={styles.steps}>
          {steps.map((label, i) => {
            const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
            return (
              <div
                key={label}
                className={[styles.step, state === 'active' ? styles.stepActive : '', state === 'done' ? styles.stepDone : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.stepIconWrap}>
                  {state === 'done' ? (
                    <CheckCircle size={20} weight="fill" />
                  ) : state === 'active' ? (
                    <CircleNotch size={18} weight="bold" className={styles.spin} />
                  ) : (
                    <CircleNotch size={18} weight="regular" />
                  )}
                </span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${PROGRESS_BY_STEP[stepIndex]}%` }} />
        </div>
      </div>
    </div>
  );
}
