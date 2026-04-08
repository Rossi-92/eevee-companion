function buildParticles(count, color, blur, drift) {
  return Array.from({ length: count }, (_, index) => (
    <span
      key={`${color}-${index}`}
      style={{
        position: 'absolute',
        left: `${(index * 11) % 100}%`,
        top: `${(index * 17) % 100}%`,
        width: blur === 0 ? 2 : 80,
        height: blur === 0 ? 20 : 80,
        background: blur === 0 ? color : `${color}22`,
        borderRadius: blur === 0 ? 999 : '50%',
        filter: `blur(${blur}px)`,
        opacity: blur === 0 ? 0.55 : 0.3,
        transform: `translate3d(0,0,0) rotate(${index * 13}deg)`,
        animation: `${drift} ${8 + (index % 5)}s linear infinite`,
      }}
    />
  ));
}

export default function WeatherEffects({ condition }) {
  if (condition === 'rain') {
    return <div style={styles.layer}>{buildParticles(36, 'rgba(196, 226, 255, 0.65)', 0, 'rainfall')}</div>;
  }

  if (condition === 'cloudy') {
    return <div style={styles.layer}>{buildParticles(10, 'rgba(255, 255, 255, 0.8)', 24, 'cloudDrift')}</div>;
  }

  if (condition === 'fog') {
    return <div style={styles.layer}>{buildParticles(6, 'rgba(211, 226, 232, 0.9)', 38, 'fogDrift')}</div>;
  }

  if (condition === 'sunny') {
    return (
      <div style={styles.layer}>
        <div style={styles.sunGlow} />
        <div style={styles.sunRay} />
      </div>
    );
  }

  return null;
}

const styles = {
  layer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  sunGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    right: -40,
    top: -40,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,220,146,0.35), transparent 70%)',
    filter: 'blur(20px)',
  },
  sunRay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(125deg, transparent 30%, rgba(255,228,170,0.16) 42%, transparent 58%)',
    transform: 'translateX(18%)',
  },
};
