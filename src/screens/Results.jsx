import { TopNav } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import { SiteSummaryHeader } from './results/SiteSummaryHeader.jsx';
import { TldrContent } from './results/TldrContent.jsx';
import { SongContent } from './results/SongContent.jsx';
import { KidContent } from './results/KidContent.jsx';
import { ComingSoon } from './results/ComingSoon.jsx';
import styles from './Results.module.css';

export function Results({ onOpenLibrary }) {
  const { state, resetToLanding } = useAppState();
  const result = state.result;

  if (!result || result.status !== 'ok') return null;

  const { site, mode, tldr, song, kid } = result;

  // All three modes have real content components now. ComingSoon is kept
  // as a defensive fallback only — it should never actually render given
  // VALID_MODES in api/analyze.js.
  return (
    <div>
      <TopNav activeScreen="results" onHome={resetToLanding} onLibrary={onOpenLibrary} savedCount={state.library.length} />
      <div className={styles.page}>
        <SiteSummaryHeader site={site} />
        <div className={styles.modeBody}>
          {mode === 'tldr' ? (
            <TldrContent site={site} tldr={tldr} />
          ) : mode === 'song' ? (
            <SongContent song={song} />
          ) : mode === 'kid' ? (
            <KidContent kid={kid} />
          ) : (
            <ComingSoon mode={mode} />
          )}
        </div>
      </div>
    </div>
  );
}
