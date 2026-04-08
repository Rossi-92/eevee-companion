import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Eevee Companion crashed during render:', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div style={styles.frame}>
        <div style={styles.card}>
          <div style={styles.badge}>Startup Recovery</div>
          <h1 style={styles.title}>The companion hit a loading problem.</h1>
          <p style={styles.body}>
            Refresh the page once. If this keeps happening, clear the site data so the latest app files can load.
          </p>
          <pre style={styles.error}>{this.state.error.message || 'Unknown render error.'}</pre>
        </div>
      </div>
    );
  }
}

const styles = {
  frame: {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background:
      'radial-gradient(circle at top, rgba(255,208,136,0.12), transparent 25%), linear-gradient(180deg, #1b2633, #081018)',
    color: 'white',
  },
  card: {
    width: 'min(560px, 100%)',
    padding: '32px 28px',
    borderRadius: 28,
    background: 'rgba(18, 25, 37, 0.78)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
  },
  badge: {
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.08)',
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  title: {
    margin: '18px 0 10px',
    fontSize: 34,
    lineHeight: 1.1,
  },
  body: {
    margin: 0,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.5,
  },
  error: {
    margin: '18px 0 0',
    padding: '14px 16px',
    borderRadius: 16,
    background: 'rgba(0,0,0,0.28)',
    color: '#ffd4c5',
    fontSize: 13,
    whiteSpace: 'pre-wrap',
  },
};
