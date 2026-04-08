function particleStyle(effect, index, themeColor) {
  const base = {
    position: 'absolute',
    left: `${(index * 17) % 100}%`,
    top: `${(index * 11) % 100}%`,
    opacity: 0.45,
    animation: `floatParticle ${5 + (index % 5)}s ease-in-out infinite`,
  };

  switch (effect) {
    case 'sparks':
      return { ...base, width: 5, height: 5, background: themeColor, borderRadius: '50%' };
    case 'embers':
      return { ...base, width: 7, height: 7, background: themeColor, borderRadius: '50%' };
    case 'bubbles':
    case 'psychicOrbs':
    case 'moonGlow':
    case 'snowflakes':
      return {
        ...base,
        width: 16,
        height: 16,
        border: `2px solid ${themeColor}`,
        borderRadius: '50%',
      };
    case 'leaves':
      return {
        ...base,
        width: 14,
        height: 10,
        background: themeColor,
        borderRadius: '80% 0 80% 0',
      };
    case 'hearts':
      return { ...base, color: themeColor, fontSize: 14 };
    default:
      return base;
  }
}

export default function EvolutionParticles({ effect, themeColor }) {
  if (!effect) {
    return null;
  }

  return (
    <div style={styles.layer}>
      {Array.from({ length: 18 }, (_, index) => {
        const style = particleStyle(effect, index, themeColor);
        return (
          <span key={`${effect}-${index}`} style={style}>
            {effect === 'hearts' ? '♥' : ''}
          </span>
        );
      })}
    </div>
  );
}

const styles = {
  layer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 6,
  },
};

