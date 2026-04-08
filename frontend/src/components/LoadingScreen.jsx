export default function LoadingScreen() {
  return (
    <div style={styles.wrap}>
      <div style={styles.pulse} />
      <div style={styles.title}>Eevee Companion</div>
      <div style={styles.subtitle}>Preparing the forest clearing...</div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background:
      'radial-gradient(circle at center, rgba(255,215,140,0.12), transparent 35%), rgba(8,12,20,0.82)',
    zIndex: 20,
  },
  pulse: {
    width: 140,
    height: 140,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,212,142,0.7), rgba(210,108,64,0.1))',
    boxShadow: '0 0 80px rgba(255, 192, 128, 0.4)',
    animation: 'pulse 2.2s ease-in-out infinite',
  },
  title: {
    position: 'absolute',
    marginTop: 170,
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: 1,
  },
  subtitle: {
    position: 'absolute',
    marginTop: 220,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
  },
};

