import { useState } from 'react';
import { ArrowRight, MusicNotes, BookOpen, Lightning } from '@phosphor-icons/react';
import { HeroArtifact } from './HeroArtifact.jsx';
import { useAppState } from '../state/AppState.jsx';
import { TopNav, TextField, Button, SelectableCard } from '../design-system/components/index.js';
import { EXAMPLE_URLS } from '../api/client.js';
import styles from './Landing.module.css';

// Tones cycle across DESIGN.md's saturated card set and never repeat
// adjacently. Lavender is reserved for Kid mode's storytelling.
const MODES = [
  {
    id: 'tldr',
    icon: Lightning,
    tone: 'ochre',
    title: 'TL;DR',
    description: 'Get the important stuff in seconds.',
  },
  {
    id: 'song',
    icon: MusicNotes,
    tone: 'pink',
    title: 'Make a Song',
    description: 'Turn knowledge into something you can sing.',
  },
  {
    id: 'kid',
    icon: BookOpen,
    tone: 'lavender',
    title: "Explain Like I'm 5",
    description: 'Turn complicated ideas into something kids can understand.',
  },
];

export function Landing({ onOpenLibrary, onHowItWorks, onAbout }) {
  const { state, setSelectedMode, startTransform } = useAppState();
  const [inputValue, setInputValue] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = (url) => {
    const value = (url ?? inputValue).trim();
    if (!value) {
      setTouched(true);
      return;
    }
    startTransform(value, state.selectedMode);
  };

  const handleChipClick = (example) => {
    setInputValue(example.url);
    startTransform(example.url, state.selectedMode);
  };

  return (
    <div>
      <TopNav activeScreen="landing" onHowItWorks={onHowItWorks} onAbout={onAbout} onHome={() => {}} onLibrary={onOpenLibrary} savedCount={state.library.length} />
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
          <div className={styles.kicker}>One URL. Three ways to understand it.</div>
          <h1 className={styles.headline}>Paste a website. Make it interesting.</h1>
          <p className={styles.subhead}>
            Turn any webpage into a quick summary, a song, or a story made for curious minds.
          </p>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <TextField
              className={styles.field}
              placeholder="Paste a website URL…"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (touched) setTouched(false);
              }}
              aria-label="Website URL"
            />
            <Button type="submit" variant="primary" icon={<ArrowRight size={18} weight="bold" />}>
              Transform Website
            </Button>
          </form>
          <div className={styles.errorHint}>{touched ? 'Paste a URL to get started.' : ''}</div>

          <div className={styles.chipsRow}>
            {EXAMPLE_URLS.map((example) => (
              <button
                key={example.url}
                type="button"
                className={styles.chip}
                onClick={() => handleChipClick(example)}
              >
                {example.label}
              </button>
            ))}
          </div>
          </div>

          <HeroArtifact />
        </div>

        <div className={styles.modeLabel}>Pick how you want to experience it</div>
        <div className={styles.modeGrid} role="radiogroup" aria-label="Transformation mode">
          {MODES.map((mode) => (
            <SelectableCard
              key={mode.id}
              name="mode"
              icon={mode.icon}
              tone={mode.tone}
              title={mode.title}
              description={mode.description}
              selected={state.selectedMode === mode.id}
              onSelect={() => setSelectedMode(mode.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
