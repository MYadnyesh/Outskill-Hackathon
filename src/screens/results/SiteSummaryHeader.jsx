import { useState } from 'react';
import { ArrowLeft, BookmarkSimple, ShareNetwork, Check } from '@phosphor-icons/react';
import { IconBadge, Button } from '../../design-system/components/index.js';
import { useAppState } from '../../state/AppState.jsx';
import styles from '../Results.module.css';

export function SiteSummaryHeader({ site }) {
  const { resetToLanding, saveCurrentResult, unsaveResult, isCurrentResultSaved, state } = useAppState();
  const [copied, setCopied] = useState(false);

  const savedId = state.result ? `${state.result.site.url}::${state.result.mode}` : null;

  const handleSave = () => {
    if (isCurrentResultSaved) unsaveResult(savedId);
    else saveCurrentResult();
  };

  const handleShare = async () => {
    const shareText = `${site.title} — via Prism (${site.url})`;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — fail silently,
      // the checkmark still gives feedback that the action ran.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button type="button" className={styles.backLink} onClick={resetToLanding}>
        <ArrowLeft size={16} weight="bold" />
        New URL
      </button>

      <div className={styles.summaryCard}>
        <IconBadge size="lg">{site.domain?.[0]?.toUpperCase() || '?'}</IconBadge>
        <div className={styles.summaryMain}>
          <div className={styles.summaryTitle}>{site.title}</div>
          <div className={styles.summaryMeta}>
            <span>{site.domain}</span>
            <span>·</span>
            <span>Analyzed just now</span>
          </div>
          {site.description ? <p className={styles.summaryDesc}>{site.description}</p> : null}
        </div>
        <div className={styles.summaryActions}>
          <Button
            variant="icon"
            active={isCurrentResultSaved}
            onClick={handleSave}
            aria-label={isCurrentResultSaved ? 'Remove from Library' : 'Save to Library'}
            title={isCurrentResultSaved ? 'Saved' : 'Save'}
            icon={<BookmarkSimple size={18} weight={isCurrentResultSaved ? 'fill' : 'regular'} />}
          />
          <Button
            variant="icon"
            active={copied}
            onClick={handleShare}
            aria-label="Copy share link"
            title="Share"
            icon={copied ? <Check size={18} weight="bold" /> : <ShareNetwork size={18} weight="regular" />}
          />
        </div>
      </div>
    </>
  );
}
