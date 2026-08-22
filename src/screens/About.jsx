import { GithubLogo, Function as FnIcon, Palette, Robot, MusicNotes, Wrench } from '@phosphor-icons/react';
import { TopNav, Button, Pill } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import styles from './About.module.css';

const REPO_URL = 'https://github.com/MYadnyesh/Outskill-Hackathon';

// Contributors verified from the repository's own commit history. Add the rest
// of the team here — `name` and `role` are all that's required.
const TEAM = [
  { name: 'Yadnyesh M', role: 'Project lead · backend & AI pipeline', handle: 'MYadnyesh' },
  { name: 'Danica', role: 'Song and Kid modes · docs', handle: 'danicat-dotcom' },
  { name: 'Ari', role: 'Concept & brainstorming' },
  { name: 'Indronil', role: 'Concept & brainstorming' },
  { name: 'Celine', role: 'Concept & brainstorming' },
];

// Everything here is actually in package.json or lib/. Versions are the ranges
// the project depends on, not aspirations.
const STACK = [
  {
    tone: 'ochre',
    icon: Palette,
    area: 'Interface',
    items: [
      ['React 19', 'UI, with a single reducer as the whole state machine'],
      ['Vite 8', 'Dev server and production build'],
      ['CSS Modules', 'Plain CSS with custom properties — no utility framework'],
      ['Phosphor Icons', 'Every icon in the app is SVG, never emoji'],
    ],
  },
  {
    tone: 'pink',
    icon: FnIcon,
    area: 'Backend',
    items: [
      ['Netlify Functions', 'One endpoint: POST /api/analyze'],
      ['Firecrawl', 'Renders the page first, so JavaScript-built sites are readable'],
      ['cheerio', 'The local fallback when Firecrawl is unavailable'],
      ['Node fetch + AbortController', 'Hard timeouts and manual redirect checking'],
    ],
  },
  {
    tone: 'lavender',
    icon: Robot,
    area: 'Intelligence',
    items: [
      ['Google Gemini', 'All three transforms, via structured JSON schemas'],
      ['Five-model fallback', 'Moves to the next model on quota, retirement or overload'],
    ],
  },
  {
    tone: 'mint',
    icon: MusicNotes,
    area: 'Audio',
    items: [
      ['ElevenLabs Music', 'Composes the real track for Song mode'],
      ['Simulated player', 'The graceful fallback when no audio key is set'],
    ],
  },
];

const PRINCIPLES = [
  {
    title: 'A wrong answer is worse than an error',
    body: 'If the AI is unavailable, Prism says so. It never quietly substitutes canned demo content for the page you actually asked about.',
  },
  {
    title: 'Only fetch what is public',
    body: 'Submitted URLs are resolved and checked before every request and after every redirect, so the service cannot be aimed at a private network.',
  },
  {
    title: 'Degrade on the smallest thing',
    body: 'When song audio runs out of time budget, you still get the lyrics. The feature that fails is the smallest one that can.',
  },
];

export function About({ onOpenLibrary, onHowItWorks, onStart }) {
  const { state, resetToLanding, goToScreen } = useAppState();

  return (
    <div>
      <TopNav
        activeScreen="about"
        onHome={resetToLanding}
        onLibrary={onOpenLibrary}
        onHowItWorks={onHowItWorks}
        onAbout={() => goToScreen('about')}
        savedCount={state.library.length}
      />

      <div className={styles.page}>
        <header className={styles.hero}>
          <p className={styles.kicker}>About</p>
          <h1 className={styles.headline}>Built in a hackathon, built to actually work.</h1>
          <p className={styles.lede}>
            Prism started from a simple frustration: the web is full of pages worth understanding and
            short on time to read them. Rather than another summariser, we built one link box with three
            genuinely different ways out — a summary, a song, or an explanation a child could follow.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={onStart}>Try it</Button>
            <a className={styles.repoLink} href={REPO_URL} target="_blank" rel="noreferrer noopener">
              <GithubLogo size={18} weight="fill" aria-hidden="true" />
              View the source
            </a>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="team-heading">
          <h2 id="team-heading" className={styles.sectionTitle}>The team</h2>
          <p className={styles.sectionLede}>
            Built for the Outskill Hackathon.
          </p>
          <div className={styles.teamGrid}>
            {TEAM.map(({ name, role, handle }) => (
              <article key={name} className={styles.person}>
                <div className={styles.avatar} aria-hidden="true">{name.charAt(0)}</div>
                <h3 className={styles.personName}>{name}</h3>
                <p className={styles.personRole}>{role}</p>
                {handle ? (
                  <a
                    className={styles.personHandle}
                    href={`https://github.com/${handle}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <GithubLogo size={14} weight="fill" aria-hidden="true" />
                    {handle}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="stack-heading">
          <h2 id="stack-heading" className={styles.sectionTitle}>What it is made of</h2>
          <div className={styles.stackGrid}>
            {STACK.map(({ tone, icon: Icon, area, items }) => (
              <article key={area} className={styles.stackCard} data-tone={tone}>
                <div className={styles.stackTop}>
                  <Icon size={26} weight="duotone" aria-hidden="true" />
                  <h3 className={styles.stackArea}>{area}</h3>
                </div>
                <ul className={styles.stackList}>
                  {items.map(([tech, why]) => (
                    <li key={tech} className={styles.stackItem}>
                      <span className={styles.tech}>{tech}</span>
                      <span className={styles.why}>{why}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="principles-heading">
          <h2 id="principles-heading" className={styles.sectionTitle}>How we decided things</h2>
          <div className={styles.principleGrid}>
            {PRINCIPLES.map(({ title, body }) => (
              <article key={title} className={styles.principle}>
                <Wrench size={20} weight="duotone" aria-hidden="true" className={styles.principleIcon} />
                <h3 className={styles.principleTitle}>{title}</h3>
                <p className={styles.principleBody}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <Pill variant="outline">Open source</Pill>
          <h2 className={styles.ctaTitle}>Read the code, or take it apart.</h2>
          <p className={styles.ctaBody}>
            Everything — the extraction, the prompts, the fallback logic — is in the repository.
          </p>
          <Button variant="secondary" onClick={onHowItWorks}>See how it works</Button>
        </section>
      </div>
    </div>
  );
}
