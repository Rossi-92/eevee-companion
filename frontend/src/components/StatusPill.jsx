export default function StatusPill({ mood, state, tone }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: tone.background,
        border: tone.border,
        boxShadow: tone.shadow,
        borderRadius: 999,
        padding: '10px 16px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      Eevee is {state} • mood: {mood}
    </div>
  );
}

