import { Triangle } from '@phosphor-icons/react';
import styles from './TopNav.module.css';

export function TopNav({ activeScreen, onHome, onLibrary, savedCount = 0 }) {
  return (
    <nav className={styles.nav}>
      <button type="button" className={styles.brand} onClick={onHome}>
        <Triangle weight="fill" size={18} className={styles.mark} />
        <span className="wordmark">Prism</span>
      </button>
      <div className={styles.links}>
        <button
          type="button"
          className={[styles.link, activeScreen === 'landing' ? styles.linkActive : ''].join(' ')}
          onClick={onHome}
        >
          Home
        </button>
        <button
          type="button"
          className={[styles.link, activeScreen === 'library' ? styles.linkActive : ''].join(' ')}
          onClick={onLibrary}
        >
          Library
          {savedCount > 0 ? <span className={styles.badge}>{savedCount}</span> : null}
        </button>
      </div>
    </nav>
  );
}
