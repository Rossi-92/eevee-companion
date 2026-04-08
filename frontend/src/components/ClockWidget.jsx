export default function ClockWidget({ now, tone }) {
  return (
    <div style={{ ...sharedWidget(tone), ...styles.root, alignItems: 'flex-start' }}>
      <div style={styles.label}>Local Time</div>
      <div style={styles.time}>
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={styles.meta}>
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
}

export function sharedWidget(tone) {
  return {
    background: tone.background,
    border: tone.border,
    boxShadow: tone.shadow,
    borderRadius: 20,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    color: 'rgba(255,255,255,0.92)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: 240,
    height: 110,
    boxSizing: 'border-box',
    justifyContent: 'center',
  };
}

const styles = {
  root: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  time: {
    fontSize: 36,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  meta: {
    color: 'rgba(255,255,255,0.74)',
  },
};

