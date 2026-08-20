import { TopNav } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import { SiteSummaryHeader } from './results/SiteSummaryHeader.jsx';
import { TldrContent } from './results/TldrContent.jsx';
import { ComingSoon } from './results/ComingSoon.jsx';
import styles from './Results.module.css';

export function Results({ onOpenLibrary }) {
  const { state, resetToLanding } = useAppState();
  const result = state.result;

  if (!result || result.status !== 'ok') return null;

  const { site, mode, tldr } = result;

  // Only TL;DR has a real content component this session — song/kid mode
  // always show the shared placeholder here, even when demo/mock data
  // happens to include full song or kid content (that mock content exists
  // as a reference shape for whoever builds SongContent/KidContent, see
  // docs/FEATURES.md — it's not meant to render until that UI exists).
  return (
    <div>
      <TopNav activeScreen="results" onHome={resetToLanding} onLibrary={onOpenLibrary} savedCount={state.library.length} />
      <div className={styles.page}>
        <SiteSummaryHeader site={site} />
        <div className={styles.modeBody}>
          {mode === 'tldr' ? <TldrContent site={site} tldr={tldr} /> : <ComingSoon mode={mode} />}
        </div>
      </div>
    </div>
  );
}
