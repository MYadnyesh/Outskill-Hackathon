import { TopNav } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import { SiteSummaryHeader } from './results/SiteSummaryHeader.jsx';
import { TldrContent } from './results/TldrContent.jsx';
import { KidContent } from './results/KidContent.jsx';
import { ComingSoon } from './results/ComingSoon.jsx';
import styles from './Results.module.css';

export function Results({ onOpenLibrary }) {
  const { state, resetToLanding } = useAppState();
  const result = state.result;

  if (!result || result.status !== 'ok') return null;

  const { site, mode, tldr, kid } = result;

  // TL;DR and Kid mode have real content components — song mode still shows
  // the shared placeholder here, even when demo/mock data happens to include
  // full song content (that mock content exists as a reference shape for
  // whoever builds SongContent, see docs/FEATURES.md — it's not meant to
  // render until that UI exists).
  return (
    <div>
      <TopNav activeScreen="results" onHome={resetToLanding} onLibrary={onOpenLibrary} savedCount={state.library.length} />
      <div className={styles.page}>
        <SiteSummaryHeader site={site} />
        <div className={styles.modeBody}>
          {mode === 'tldr' ? (
            <TldrContent site={site} tldr={tldr} />
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
