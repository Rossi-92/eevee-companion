const PHASES = [
  {
    name: 'night',
    startMinutes: 20 * 60 + 30,
    endMinutes: 5 * 60 + 30,
    hueRotate: 220,
    brightness: 0.35,
    saturate: 0.7,
    overlay: 'rgba(8, 12, 30, 0.55)',
  },
  {
    name: 'dawn',
    startMinutes: 5 * 60 + 30,
    endMinutes: 7 * 60 + 30,
    hueRotate: 15,
    brightness: 0.65,
    saturate: 1.1,
    overlay: 'rgba(60, 20, 30, 0.20)',
  },
  {
    name: 'morning',
    startMinutes: 7 * 60 + 30,
    endMinutes: 11 * 60,
    hueRotate: 0,
    brightness: 0.9,
    saturate: 1,
    overlay: 'transparent',
  },
  {
    name: 'day',
    startMinutes: 11 * 60,
    endMinutes: 16 * 60,
    hueRotate: 0,
    brightness: 1,
    saturate: 1,
    overlay: 'transparent',
  },
  {
    name: 'golden',
    startMinutes: 16 * 60,
    endMinutes: 18 * 60 + 30,
    hueRotate: 25,
    brightness: 0.82,
    saturate: 1.2,
    overlay: 'rgba(80, 40, 0, 0.12)',
  },
  {
    name: 'dusk',
    startMinutes: 18 * 60 + 30,
    endMinutes: 20 * 60 + 30,
    hueRotate: 300,
    brightness: 0.55,
    saturate: 0.85,
    overlay: 'rgba(20, 10, 30, 0.35)',
  },
];

function getMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinRange(current, start, end) {
  if (start <= end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function getTimeOfDayState(date = new Date(), weatherCondition = 'sunny') {
  const minutes = getMinutes(date);
  const phase =
    PHASES.find((entry) => isWithinRange(minutes, entry.startMinutes, entry.endMinutes)) ||
    PHASES[0];

  const brightness = weatherCondition === 'rain' ? phase.brightness - 0.1 : phase.brightness;

  return {
    phase: phase.name,
    filter: `hue-rotate(${phase.hueRotate}deg) brightness(${brightness}) saturate(${phase.saturate})`,
    overlay: phase.overlay,
    widgetTone:
      phase.name === 'day' || phase.name === 'morning'
        ? {
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            shadow: '0 8px 32px rgba(0,0,0,0.08)',
          }
        : {
            background: 'rgba(8,12,25,0.30)',
            border: '1px solid rgba(100,140,200,0.12)',
            shadow: '0 8px 32px rgba(0,0,0,0.30)',
          },
  };
}

