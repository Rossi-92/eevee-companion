export default function Controls({ onTalk, onPet, onSleep, onEvolve, disabled, talkLabel = 'Talk' }) {
  const buttons = [
    { label: 'Sleep', icon: '☾', onClick: onSleep },
    { label: talkLabel, icon: '🎤', onClick: onTalk },
    { label: 'Pet', icon: '♡', onClick: onPet },
    { label: 'Evolve', icon: '✦', onClick: onEvolve },
  ];

  return (
    <div style={styles.wrap}>
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          onClick={button.onClick}
          disabled={disabled}
          style={{ ...styles.button, opacity: disabled ? 0.6 : 1 }}
        >
          <span style={styles.icon}>{button.icon}</span>
          <span>{button.label}</span>
        </button>
      ))}
    </div>
  );
}

const styles = {
  wrap: {
    position: 'absolute',
    left: '50%',
    bottom: 28,
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 18,
    zIndex: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(10,16,26,0.4)',
    color: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    padding: '16px 20px',
    minWidth: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  },
  icon: {
    fontSize: 20,
  },
};
