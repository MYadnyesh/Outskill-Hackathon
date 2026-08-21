import { TopNav } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import { SiteSummaryHeader } from './results/SiteSummaryHeader.jsx';
import { TldrContent } from './results/TldrContent.jsx';
import { SongContent } from './results/SongContent.jsx';
import { ComingSoon } from './results/ComingSoon.jsx';
import styles from './Results.module.css';

export function Results({ onOpenLibrary }) {
  const { state, resetToLanding } = useAppState();
  const result = state.result;

  if (!result || result.status !== 'ok') return null;

  const { site, mode, tldr, song } = result;

  // TL;DR and Song mode have real content components — kid mode still shows
  // the shared placeholder (that mock content exists as a reference shape
  // for whoever builds KidContent, see docs/FEATURES.md — it's not meant
  // to render until that UI exists).
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
          ) : (
            <ComingSoon mode={mode} />
          )}
        </div>
      </div>
    </div>
  );
}
