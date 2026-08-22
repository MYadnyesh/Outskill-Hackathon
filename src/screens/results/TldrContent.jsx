import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  ListNumbers,
  LinkSimple,
  Tag,
  FileText,
  ClipboardText,
  BookmarkSimple,
  ShareNetwork,
  Check,
} from '@phosphor-icons/react';
import { Pill, Button } from '../../design-system/components/index.js';
import { useAppState } from '../../state/AppState.jsx';
import styles from './TldrContent.module.css';

export function TldrContent({ site, tldr }) {
  const { isCurrentResultSaved, saveCurrentResult, unsaveResult, state } = useAppState();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const savedId = state.result ? `${state.result.site.url}::${state.result.mode}` : null;

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(tldr.summary);
    } catch {
      /* clipboard unavailable — checkmark still gives feedback */
    }
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 1800);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${site.title} — via Prism (${site.url})`);
    } catch {
      /* no-op */
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 1800);
  };

  const stats = [
    { icon: Clock, value: `${site.stats?.readingTimeMinutes ?? '—'} min`, label: 'Reading time' },
    { icon: ListNumbers, value: site.stats?.headingCount ?? '—', label: 'Headings' },
    { icon: LinkSimple, value: site.stats?.linkCount ?? '—', label: 'Links' },
    { icon: Tag, value: tldr.mainTopic || '—', label: 'Main topic' },
    { icon: FileText, value: site.stats?.contentType || '—', label: 'Content type' },
  ];

  return (
    <div className={styles.section}>
      <div>
        <div className={styles.kicker}>TL;DR</div>
        <p className={styles.summary}>{tldr.summary}</p>
      </div>

      <div className={styles.section} style={{ marginTop: 'var(--space-3)' }}>
        <div className={styles.sectionTitle}>Key takeaways</div>
        <div className={styles.takeawayGrid}>
          {tldr.takeaways.map((point, i) => (
            <div className={styles.takeawayCard} key={i}>
              <CheckCircle size={18} weight="fill" className={styles.takeawayIcon} />
              <span className={styles.takeawayText}>{point}</span>
            </div>
          ))}
        </div>
      </div>

      {tldr.topics?.length ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>What it covers</div>
          <div className={styles.topicGrid}>
            {tldr.topics.map((topic) => {
              // Older saved results stored topics as plain strings.
              const name = typeof topic === 'string' ? topic : topic.name;
              const note = typeof topic === 'string' ? '' : topic.note;
              return (
                <div className={styles.topicCard} key={name}>
                  <Pill variant="outline">{name}</Pill>
                  {note ? <p className={styles.topicNote}>{note}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quick stats</div>
        <div className={styles.statsGrid}>
          {stats.map(({ icon: Icon, value, label }) => (
            <div className={styles.statCard} key={label}>
              <Icon size={20} weight="regular" className={styles.statIcon} />
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actionRow}>
        <Button variant="secondary" icon={copiedSummary ? <Check size={16} weight="bold" /> : <ClipboardText size={16} />} onClick={copySummary}>
          {copiedSummary ? 'Copied' : 'Copy summary'}
        </Button>
        <Button
          variant="secondary"
          active={isCurrentResultSaved}
          icon={<BookmarkSimple size={16} weight={isCurrentResultSaved ? 'fill' : 'regular'} />}
          onClick={() => (isCurrentResultSaved ? unsaveResult(savedId) : saveCurrentResult())}
        >
          {isCurrentResultSaved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="secondary" icon={copiedShare ? <Check size={16} weight="bold" /> : <ShareNetwork size={16} />} onClick={share}>
          {copiedShare ? 'Copied' : 'Share'}
        </Button>
      </div>
    </div>
  );
}
