export default function SpeechBubble({ text, tone }) {
  if (!text) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '22%',
        transform: 'translateX(-50%)',
        maxWidth: 480,
        zIndex: 10,
        padding: '18px 22px',
        borderRadius: 24,
        background: tone.background,
        border: tone.border,
        boxShadow: tone.shadow,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
}

