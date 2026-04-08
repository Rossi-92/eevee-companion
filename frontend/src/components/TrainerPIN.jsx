import { useEffect, useRef, useState } from 'react';

export default function TrainerPIN({ onSubmit, isSubmitting, error }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef([]);

  const pin = digits.join('');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 4 && !digits.includes('') && !isSubmitting) {
      onSubmit(pin).catch(() => {});
    }
  }, [digits, isSubmitting, onSubmit, pin]);

  function updateDigit(index, value) {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextValue;
    setDigits(nextDigits);

    if (nextValue && index < 3) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(event, index) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <div style={styles.frame}>
      <div style={styles.card}>
        <div style={styles.badge}>Trainer Verification</div>
        <h1 style={styles.title}>Welcome back, Lilianna</h1>
        <p style={styles.body}>Enter your 4-digit trainer PIN to wake Eevee up.</p>
        <div style={styles.row}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              aria-label={`PIN digit ${index + 1}`}
              inputMode="numeric"
              maxLength={1}
              type="password"
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              style={styles.input}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onSubmit(pin)}
          disabled={pin.length < 4 || isSubmitting}
          style={{
            ...styles.button,
            opacity: pin.length < 4 || isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Checking...' : 'Open Companion'}
        </button>
        <div style={styles.error}>{error || ' '}</div>
      </div>
    </div>
  );
}

const styles = {
  frame: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    background:
      'radial-gradient(circle at top, rgba(255,208,136,0.12), transparent 25%), linear-gradient(180deg, rgba(20,30,45,0.75), rgba(5,10,18,0.92))',
    zIndex: 30,
    padding: 24,
  },
  card: {
    width: 'min(540px, 100%)',
    padding: '32px 28px',
    borderRadius: 28,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    background: 'rgba(18, 25, 37, 0.65)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
    textAlign: 'center',
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
    margin: '20px 0 8px',
    fontSize: 36,
  },
  body: {
    margin: 0,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 18,
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    margin: '28px 0 24px',
  },
  input: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.08)',
    color: 'white',
    textAlign: 'center',
    fontSize: 28,
    outline: 'none',
  },
  button: {
    border: 'none',
    borderRadius: 999,
    background: 'linear-gradient(135deg, #ffd782, #f07343)',
    color: '#2b170d',
    padding: '14px 22px',
    fontWeight: 700,
    fontSize: 18,
  },
  error: {
    minHeight: 24,
    marginTop: 16,
    color: '#ffb4ad',
  },
};

