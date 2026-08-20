import { BookmarkSimple } from '@phosphor-icons/react';
import { TopNav, IconBadge, Pill, Button } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import styles from './Library.module.css';

const MODE_LABEL = { tldr: 'TL;DR', song: 'Make a Song', kid: "Explain Like I'm 5" };

function formatSavedDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function Library({ onOpenLanding }) {
  const { state, openLibraryItem, resetToLanding } = useAppState();

  return (
    <div>
      <TopNav activeScreen="library" onHome={resetToLanding} onLibrary={() => {}} savedCount={state.library.length} />
      <div className={styles.page}>
        <h1 className={styles.heading}>My Library</h1>
        <p className={styles.subhead}>Every page you've saved, ready to reopen in the mode you saved it in.</p>

        {state.library.length === 0 ? (
          <div className={styles.empty}>
            <IconBadge size="lg" tone="neutral">
              <BookmarkSimple size={28} />
            </IconBadge>
            <div className={styles.emptyTitle}>Nothing saved yet</div>
            <p className={styles.emptyBody}>
              Transform a website and hit save to keep it here for later — TL;DRs, songs, and kid-friendly stories all
              live in one place.
            </p>
            <Button variant="primary" onClick={onOpenLanding}>
              Transform a website
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {state.library.map((item) => (
              <button key={item.id} type="button" className={styles.item} onClick={() => openLibraryItem(item.id)}>
                <IconBadge>{item.site.domain?.[0]?.toUpperCase() || '?'}</IconBadge>
                <div className={styles.itemTitle}>{item.site.title}</div>
                <div className={styles.itemMeta}>
                  {item.site.domain} · {formatSavedDate(item.savedAt)}
                </div>
                <Pill variant="accent">{MODE_LABEL[item.mode] || item.mode}</Pill>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
