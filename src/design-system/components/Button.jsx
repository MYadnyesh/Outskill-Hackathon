import styles from './Button.module.css';

/**
 * Shared Button — variants: primary (accent outline), secondary (neutral),
 * ghost, icon-only, block-width. See docs/FEATURES.md for the component kit
 * contract if you're extending this.
 *
 * @param {'primary'|'secondary'|'ghost'|'icon'} variant
 * @param {'md'|'lg'} size - 'lg' is for a page's terminal action
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  icon = null,
  iconPosition = 'right',
  active = false,
  className = '',
  children,
  ...rest
}) {
  const variantClass = variant === 'icon' ? styles.iconOnly : styles[variant] || styles.secondary;
  const classes = [
    styles.btn,
    variantClass,
    size === 'lg' ? styles.lg : '',
    block ? styles.block : '',
    active ? styles.active : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...rest}>
      {icon && iconPosition === 'left' ? icon : null}
      {children}
      {icon && iconPosition === 'right' && variant !== 'icon' ? icon : null}
      {icon && variant === 'icon' ? icon : null}
    </button>
  );
}
