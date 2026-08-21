import styles from './HeroArtifact.module.css';

/**
 * The hero artifact — a prism splitting one white beam into three coloured
 * ones. DESIGN.md calls for a 3D claymation illustration here; those are
 * commissioned assets, so this is the honest substitute: a flat geometric
 * figure built from the same saturated palette.
 *
 * The three exit beams are deliberately the three mode colours (ochre =
 * TL;DR, pink = Song, lavender = Kid), so the picture states the product
 * thesis — one URL, three ways to understand it — rather than just decorating.
 */
export function HeroArtifact() {
  return (
    <div className={styles.frame}>
      <svg
        className={styles.svg}
        viewBox="0 0 400 320"
        role="img"
        aria-label="A prism splitting a single beam of light into three coloured beams, one for each mode."
      >
        {/* incoming beam */}
        <line x1="8" y1="160" x2="172" y2="160" className={styles.beamIn} />

        {/* the prism */}
        <path d="M200 78 L262 196 L138 196 Z" className={styles.prismFill} />
        <path d="M200 78 L262 196 L138 196 Z" className={styles.prismEdge} />
        {/* inner refraction hint */}
        <path d="M200 78 L200 196" className={styles.prismInner} />

        {/* three exit beams — one per mode */}
        <line x1="232" y1="150" x2="392" y2="92" className={styles.beamOchre} />
        <line x1="234" y1="162" x2="392" y2="162" className={styles.beamPink} />
        <line x1="232" y1="174" x2="392" y2="232" className={styles.beamLavender} />

        {/* beam terminals */}
        <circle cx="392" cy="92" r="7" className={styles.dotOchre} />
        <circle cx="392" cy="162" r="7" className={styles.dotPink} />
        <circle cx="392" cy="232" r="7" className={styles.dotLavender} />
      </svg>
    </div>
  );
}
