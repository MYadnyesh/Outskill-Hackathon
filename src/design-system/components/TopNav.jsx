import { useEffect, useRef, useState } from 'react';
import { Triangle, List, X } from '@phosphor-icons/react';
import styles from './TopNav.module.css';

/**
 * Top navigation. Stays presentational — it takes callbacks rather than
 * reaching into app state, so the design-system kit has no dependency on
 * the state machine.
 *
 * Below 768px the links collapse into a disclosure menu, per DESIGN.md.
 * Four links do not fit beside the wordmark at 375px, and letting them
 * overflow would scroll the whole page sideways.
 */
export function TopNav({
  activeScreen,
  onHome,
  onLibrary,
  onHowItWorks,
  onAbout,
  savedCount = 0,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  // Escape closes the menu and hands focus back to the button that opened it,
  // so keyboard users are never stranded inside a collapsed menu.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const links = [
    { id: 'landing', label: 'Home', onClick: onHome },
    { id: 'how', label: 'How it works', onClick: onHowItWorks },
    { id: 'about', label: 'About', onClick: onAbout },
    { id: 'library', label: 'Library', onClick: onLibrary, badge: savedCount },
  ].filter((l) => l.onClick);

  const go = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <nav className={styles.nav} aria-label="Main">
      <button type="button" className={styles.brand} onClick={go(onHome)}>
        <Triangle weight="fill" size={18} className={styles.mark} />
        <span className="wordmark">Prism</span>
      </button>

      <button
        type="button"
        ref={triggerRef}
        className={styles.menuToggle}
        aria-expanded={open}
        aria-controls="topnav-links"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
      </button>

      <div
        id="topnav-links"
        className={[styles.links, open ? styles.linksOpen : ''].filter(Boolean).join(' ')}
      >
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            className={[styles.link, activeScreen === link.id ? styles.linkActive : '']
              .filter(Boolean)
              .join(' ')}
            aria-current={activeScreen === link.id ? 'page' : undefined}
            onClick={go(link.onClick)}
          >
            {link.label}
            {link.badge > 0 ? <span className={styles.badge}>{link.badge}</span> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
