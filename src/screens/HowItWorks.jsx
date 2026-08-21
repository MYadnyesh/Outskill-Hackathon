import {
  Link as LinkIcon,
  Article,
  Sparkle,
  Playlist,
  Lightning,
  MusicNotes,
  BookOpen,
  ShieldCheck,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';
import { TopNav, Button } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import styles from './HowItWorks.module.css';

// The four pipeline stages, in the order api/analyze.js actually runs them.
// Tones cycle through the brand set and never repeat adjacently.
const STEPS = [
  {
    n: '01',
    tone: 'ochre',
    icon: LinkIcon,
    title: 'You paste a URL',
    body: 'Pick one of the three modes first — the mode is locked in for that run, so Prism only does the work you asked for. Nothing is uploaded and nothing is stored; the link is the entire input.',
  },
  {
    n: '02',
    tone: 'pink',
    icon: Article,
    title: 'Prism reads the page',
    body: 'A serverless function fetches the page and parses the HTML server-side, stripping navigation, scripts and footers so only the real article text is left. It also counts headings, links and reading time — plain arithmetic, no AI needed for that part.',
  },
  {
    n: '03',
    tone: 'lavender',
    icon: Sparkle,
    title: 'Gemini rewrites it for your mode',
    body: 'The cleaned text goes to Google Gemini with a strict response schema, so the model returns structured data the interface can render directly rather than a wall of prose to unpick. Each mode has its own prompt and its own schema.',
  },
  {
    n: '04',
    tone: 'mint',
    icon: Playlist,
    title: 'You get it back',
    body: 'The result renders in the layout built for that mode — a summary with key takeaways, a full set of lyrics with a player, or an explanation with a story and a quiz. Save it and it stays in your Library for the session.',
  },
];

const MODES = [
  {
    tone: 'ochre',
    icon: Lightning,
    title: 'TL;DR',
    body: 'A short summary, four to five key takeaways, the topics the page covers, and quick stats — reading time, heading count, link count.',
  },
  {
    tone: 'pink',
    icon: MusicNotes,
    title: 'Make a Song',
    body: 'Original lyrics grounded in the page, structured into verses, a repeated chorus and a bridge. With an ElevenLabs key configured it also composes a real audio track.',
  },
  {
    tone: 'lavender',
    icon: BookOpen,
    title: "Explain Like I'm 5",
    body: 'A plain-language explanation, a short illustrative story, a handful of fun facts, and a three-question quiz that scores itself.',
  },
];

// Stated plainly on purpose — these are real constraints of the build, and
// finding them out mid-demo is worse than reading them here.
const LIMITS = [
  {
    icon: WarningCircle,
    title: 'Pages that build themselves in the browser come back thin',
    body: 'Prism reads the HTML the server sends. Sites that render their content with JavaScript after load will look nearly empty to it, and you will get an error rather than a confident wrong answer.',
  },
  {
    icon: Clock,
    title: 'There is a daily AI budget',
    body: 'The free Gemini tier allows 20 requests per day per model. Prism walks a five-model list and moves to the next one when a model is exhausted, overloaded or retired, which multiplies the budget — but it is not unlimited.',
  },
  {
    icon: ShieldCheck,
    title: 'It only fetches public pages',
    body: 'Every URL is resolved and checked before it is fetched, and again after every redirect. Private, internal and loopback addresses are refused, so the service cannot be pointed at a network it should not reach.',
  },
];

export function HowItWorks({ onOpenLibrary, onAbout, onStart }) {
  const { state, resetToLanding, goToScreen } = useAppState();

  return (
    <div>
      <TopNav
        activeScreen="how"
        onHome={resetToLanding}
        onLibrary={onOpenLibrary}
        onHowItWorks={() => goToScreen('how')}
        onAbout={onAbout}
        savedCount={state.library.length}
      />

      <div className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.kicker}>How it works</p>
          <h1 className={styles.headline}>One link in. Four steps later, something worth reading.</h1>
          <p className={styles.lede}>
            Prism does not summarise a page from its title and hope for the best. It fetches the real
            page, strips it down to the actual writing, and asks a model to rebuild it in the shape you
            picked. Here is every step, in order.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="pipeline-heading">
          <h2 id="pipeline-heading" className={styles.sectionTitle}>The pipeline</h2>
          <ol className={styles.steps}>
            {STEPS.map(({ n, tone, icon: Icon, title, body }) => (
              <li key={n} className={styles.step} data-tone={tone}>
                <div className={styles.stepTop}>
                  <Icon size={26} weight="duotone" aria-hidden="true" />
                  <span className={styles.stepNum}>{n}</span>
                </div>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepBody}>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="modes-heading">
          <h2 id="modes-heading" className={styles.sectionTitle}>What each mode gives you</h2>
          <div className={styles.modeGrid}>
            {MODES.map(({ tone, icon: Icon, title, body }) => (
              <article key={title} className={styles.modeCard} data-tone={tone}>
                <Icon size={28} weight="duotone" aria-hidden="true" />
                <h3 className={styles.modeTitle}>{title}</h3>
                <p className={styles.modeBody}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="limits-heading">
          <h2 id="limits-heading" className={styles.sectionTitle}>What it will not do</h2>
          <p className={styles.sectionLede}>
            Every tool has edges. These are Prism&rsquo;s, written down rather than discovered the hard way.
          </p>
          <div className={styles.limitGrid}>
            {LIMITS.map(({ icon: Icon, title, body }) => (
              <article key={title} className={styles.limitCard}>
                <Icon size={22} weight="duotone" aria-hidden="true" className={styles.limitIcon} />
                <div>
                  <h3 className={styles.limitTitle}>{title}</h3>
                  <p className={styles.limitBody}>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Try it on something you were going to skim anyway.</h2>
          <Button variant="primary" onClick={onStart}>Paste a link</Button>
        </section>
      </div>
    </div>
  );
}
