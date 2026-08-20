/** Rule that fades to transparent at both ends over ~48px, per the Nocturne spec. */
export function Divider({ className = '' }) {
  return (
    <div
      className={className}
      style={{
        height: 1,
        width: '100%',
        background:
          'linear-gradient(90deg, transparent 0, var(--border) 48px, var(--border) calc(100% - 48px), transparent 100%)',
      }}
    />
  );
}
