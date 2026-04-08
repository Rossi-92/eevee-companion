export default function PokemonBadge({ name, visible, onClick, tone }) {
  if (!name) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute',
        left: 24,
        bottom: 28,
        zIndex: 12,
        opacity: visible ? 0.72 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: visible ? 'auto' : 'none',
        border: tone.border,
        background: tone.background,
        color: 'rgba(255,255,255,0.92)',
        borderRadius: 18,
        padding: '10px 14px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      Today: {name}
    </button>
  );
}

