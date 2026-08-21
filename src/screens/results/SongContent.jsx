import { useState } from 'react';
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  ClipboardText,
  Check,
  BookmarkSimple,
} from '@phosphor-icons/react';
import { SegmentedControl, Button } from '../../design-system/components/index.js';
import { useAppState } from '../../state/AppState.jsx';
import { useSongPlayback } from './useSongPlayback.js';
import styles from './SongContent.module.css';

// Demo-only per the product spec: picking a style swaps the displayed genre
// label, it does NOT regenerate the song.
const STYLE_OPTIONS = [
  { value: 'Pop', label: 'Pop' },
  { value: 'Rap', label: 'Rap' },
  { value: 'Lo-fi', label: 'Lo-fi' },
  { value: 'Rock', label: 'Rock' },
];

const WAVEFORM_BARS = 40;

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Deterministic per-bar height so the waveform looks irregular but doesn't
// reshuffle on every render.
function barHeight(index) {
  const wave = Math.sin(index * 1.7) + Math.sin(index * 0.6);
  return 28 + Math.round(((wave + 2) / 4) * 62); // 28%..90%
}

function Waveform({ isPlaying }) {
  return (
    <div className={styles.waveform} aria-hidden="true">
      {Array.from({ length: WAVEFORM_BARS }, (_, i) => (
        <span
          key={i}
          className={[styles.bar, isPlaying ? styles.barPlaying : ''].filter(Boolean).join(' ')}
          style={{ height: `${barHeight(i)}%`, animationDelay: `${(i % 8) * 0.09}s` }}
        />
      ))}
    </div>
  );
}

export function SongContent({ song }) {
  const { isCurrentResultSaved, saveCurrentResult, unsaveResult, state } = useAppState();
  const { isPlaying, elapsed, duration, isSimulated, toggle, seek, restart } = useSongPlayback(song);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const savedId = state.result ? `${state.result.site.url}::${state.result.mode}` : null;
  const displayedGenre = selectedStyle || song.genre;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;

  const seekFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    seek(ratio * duration);
  };

  const handleProgressKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      seek(elapsed + 5);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      seek(elapsed - 5);
    }
  };

  const copyLyrics = async () => {
    const text = song.lyrics
      .map((section) => `[${section.section}]\n${section.lines.join('\n')}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable — the checkmark still confirms the action ran */
    }
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 1800);
  };

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <div>
          <div className={styles.kicker}>MAKE A SONG</div>
          <h2 className={styles.title}>{song.title}</h2>
          <div className={styles.genreLine}>
            {displayedGenre}
            {song.mood ? ` · ${song.mood}` : ''}
          </div>
          <p className={styles.description}>{song.description}</p>
        </div>

        <SegmentedControl
          options={STYLE_OPTIONS}
          value={selectedStyle}
          onChange={setSelectedStyle}
          aria-label="Song style"
        />

        <div className={styles.playerCard}>
          <Waveform isPlaying={isPlaying} />

          <button
            type="button"
            className={styles.progressTrack}
            onClick={seekFromEvent}
            onKeyDown={handleProgressKeyDown}
            aria-label="Seek"
          >
            <span className={styles.progressFill} style={{ width: `${progress}%` }} />
          </button>

          <div className={styles.timeRow}>
            <span>{formatTime(elapsed)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className={styles.controls}>
            <Button
              variant="icon"
              onClick={restart}
              aria-label="Restart"
              title="Restart"
              icon={<ArrowCounterClockwise size={18} />}
            />
            <button
              type="button"
              className={styles.playButton}
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={24} weight="fill" /> : <Play size={24} weight="fill" />}
            </button>
            <Button
              variant="icon"
              active={copiedLyrics}
              onClick={copyLyrics}
              aria-label="Copy lyrics"
              title="Copy lyrics"
              icon={copiedLyrics ? <Check size={18} weight="bold" /> : <ClipboardText size={18} />}
            />
          </div>

          {isSimulated ? (
            <p className={styles.simulatedNote}>
              Preview playback — real audio needs an ElevenLabs key.
            </p>
          ) : null}
        </div>

        <Button
          variant="secondary"
          block
          active={isCurrentResultSaved}
          icon={<BookmarkSimple size={16} weight={isCurrentResultSaved ? 'fill' : 'regular'} />}
          onClick={() => (isCurrentResultSaved ? unsaveResult(savedId) : saveCurrentResult())}
        >
          {isCurrentResultSaved ? 'Song saved' : 'Save song'}
        </Button>
      </div>

      <div className={styles.lyricsPanel}>
        <div className={styles.lyricsTitle}>Lyrics</div>
        <div className={styles.lyricsScroll}>
          {song.lyrics.map((section, i) => (
            <div className={styles.lyricSection} key={`${section.section}-${i}`}>
              <div className={styles.sectionKicker}>{section.section}</div>
              {section.lines.map((line, j) => (
                <p className={styles.lyricLine} key={j}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
