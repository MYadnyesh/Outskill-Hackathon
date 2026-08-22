import { useEffect, useRef, useState } from 'react';
import { GithubLogo, Function as FnIcon, Palette, Robot, MusicNotes, Wrench } from '@phosphor-icons/react';
import { TopNav, Button, Pill } from '../design-system/components/index.js';
import { useAppState } from '../state/AppState.jsx';
import styles from './About.module.css';

const REPO_URL = 'https://github.com/MYadnyesh/Outskill-Hackathon';

// `name` and `role` are required; `photo`, `bio` and `handle` are optional.
// A missing or broken photo falls back to the initial-letter avatar, so the
// grid never breaks on an asset that hasn't been added yet.
// Photos go in public/team/ — see the README there for the expected filenames.
const TEAM = [
  {
    name: 'Yadnyesh M',
    role: 'Project lead · backend & AI pipeline',
    handle: 'MYadnyesh',
    photo: '/team/yadnyesh.jpg',
    bio: 'India-based full stack developer with 2+ years of hands-on experience building scalable, high-performance web applications that balance clean architecture, usability and long-term maintainability. Enjoys owning features end to end — from designing intuitive frontend interfaces to building secure backend APIs and supporting cloud deployments.',
  },
  {
    name: 'Danica',
    role: 'Song and Kid modes · docs',
    handle: 'danicat-dotcom',
    photo: '/team/danica.jpg',
  },
  {
    name: 'Ari',
    role: 'Concept & brainstorming',
    photo: '/team/ari.jpg',
    bio: 'A seasoned educator who champions win-win-win university–industry collaboration and works to push societies forward by making ICT, AI and automation more sustainable. An established IEEE Senior Member whose research interests span digitalization, sustainability in societies, and modern creative technologies, with 20+ years contributing to education development.',
  },
  {
    name: 'Indronil',
    role: 'Supply Chain & Procurement Leader · concept & brainstorming',
    photo: '/team/indronil.jpg',
    bio: 'Strategic thinker, growth driver and AI enthusiast. A seasoned supply chain leader with 17+ years driving strategic transformation across procurement, demand planning, forecasting and logistics, with a proven track record of delivering P&L impact, operational excellence and high-performing teams across global organisations. Passionate about using data, AI and technology to solve complex supply chain challenges and build future-ready, resilient and sustainable businesses.',
  },
  {
    name: 'Céline Loeuille',
    role: 'Program Manager · concept & brainstorming',
    photo: '/team/celine.jpg',
    bio: 'Freelance Program Manager in Digital Manufacturing & Automation for Life Sciences, based in Brussels, currently leading the connection of production equipment to MES.',
  },
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

/**
 * Bio clamped to a few lines, with a toggle that appears ONLY when the text
 * genuinely overflows — a "Read more" on a two-line bio is noise.
 *
 * Overflow is measured rather than guessed from character count, because
 * whether a bio clips depends on the column width it lands in.
 */
function TeamBio({ text }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [clips, setClips] = useState(false);

  useEffect(() => {
    // Only meaningful while collapsed — once expanded the element grows to fit
    // and would always measure as "not clipping", hiding the way back.
    if (expanded) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setClips(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className={styles.bioBlock}>
      <p
        ref={ref}
        className={[styles.personBio, expanded ? styles.personBioOpen : ''].filter(Boolean).join(' ')}
      >
        {text}
      </p>
      {clips ? (
        <button
          type="button"
          className={styles.bioToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}

/** Photo if one is present and loads; the initial letter otherwise. */
function TeamAvatar({ name, photo }) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <img
        className={styles.avatarPhoto}
        src={photo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={styles.avatar} aria-hidden="true">
      {name.charAt(0)}
    </div>
  );
}

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
            {TEAM.map(({ name, role, handle, photo, bio }) => (
              <article key={name} className={styles.person}>
                <TeamAvatar name={name} photo={photo} />
                <h3 className={styles.personName}>{name}</h3>
                <p className={styles.personRole}>{role}</p>
                {bio ? <TeamBio text={bio} /> : null}
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
