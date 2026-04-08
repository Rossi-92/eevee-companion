import { sharedWidget } from './ClockWidget.jsx';
import { WEATHER_SYMBOLS } from '../constants/weatherConfig.js';

export default function WeatherWidget({ weather, tone }) {
  return (
    <div style={{ ...sharedWidget(tone), ...styles.root }}>
      <div style={styles.icon}>{WEATHER_SYMBOLS[weather.icon] || '☀'}</div>
      <div>
        <div style={styles.temp}>{weather.temp}°C</div>
        <div style={styles.label}>{weather.label}</div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    position: 'absolute',
    top: 24,
    right: 24,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  icon: {
    fontSize: 32,
    marginRight: 14,
  },
  temp: {
    fontSize: 28,
    fontWeight: 700,
  },
  label: {
    color: 'rgba(255,255,255,0.72)',
  },
};

