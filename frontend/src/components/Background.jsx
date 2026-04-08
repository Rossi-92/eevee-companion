export default function Background({ timeState }) {
  return (
    <>
      <div style={{ ...styles.base, filter: timeState.filter }} />
      <div style={{ ...styles.overlay, background: timeState.overlay }} />
    </>
  );
}

const styles = {
  base: {
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(circle at 50% 65%, rgba(244, 206, 123, 0.22), transparent 15%),
      radial-gradient(circle at 50% 90%, rgba(84, 125, 60, 0.38), transparent 30%),
      linear-gradient(180deg, rgba(103, 160, 167, 0.82) 0%, rgba(59, 92, 72, 0.82) 52%, rgba(24, 45, 30, 1) 100%)
    `,
    transition: 'filter 8s ease',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    transition: 'background 8s ease',
  },
};

