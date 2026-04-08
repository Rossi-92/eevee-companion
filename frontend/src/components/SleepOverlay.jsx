export default function SleepOverlay({ visible, onWake }) {
  return (
    <button
      type="button"
      onClick={onWake}
      style={{
        position: 'absolute',
        inset: 0,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 1.2s ease',
        zIndex: 25,
        border: 'none',
        background:
          'radial-gradient(circle at center, rgba(255,255,255,0.04), transparent 25%), rgba(0,0,0,0.94)',
        color: 'rgba(255,255,255,0.88)',
        fontSize: 28,
      }}
    >
      Tap the screen or say “Hi Eevee” to wake your companion.
    </button>
  );
}

