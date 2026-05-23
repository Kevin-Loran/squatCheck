const styles = {
  screen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '2rem',
    background: '#0a0a0a',
    color: '#fff',
    fontFamily: "'system-ui', sans-serif",
    gap: '1.5rem',
    textAlign: 'center',
  },
  logo: {
    fontSize: 48,
    lineHeight: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#fff',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.6,
    maxWidth: 280,
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
    maxWidth: 300,
    marginTop: '0.5rem',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    textAlign: 'left',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    border: '0.5px solid rgba(255,255,255,0.08)',
  },
  stepIcon: {
    fontSize: 18,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 1,
  },
  stepText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.5,
  },
  btn: {
    marginTop: '0.5rem',
    width: '100%',
    maxWidth: 300,
    padding: '0.9rem',
    background: '#00ff88',
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    letterSpacing: '-0.01em',
  },
  errorBox: {
    background: 'rgba(255,60,60,0.12)',
    border: '0.5px solid rgba(255,60,60,0.3)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    color: '#ff6b6b',
    fontSize: 13,
    maxWidth: 300,
    lineHeight: 1.5,
  },
}

const STEPS = [
  { icon: '📐', text: 'Posicione o celular de lado, na altura do quadril' },
  { icon: '↔️', text: 'Fique a ~2 metros de distância da câmera' },
  { icon: '🎽', text: 'Vista roupa justa para melhor detecção' },
  { icon: '💡', text: 'Boa iluminação frontal — evite contraluz' },
]

export default function StartScreen({ onStart, error, isRequesting }) {
  return (
    <div style={styles.screen}>
      <div style={styles.logo}>🏋️</div>

      <div>
        <h1 style={styles.title}>SquatCheck</h1>
        <p style={styles.subtitle}>
          Análise de agachamento em tempo real via câmera
        </p>
      </div>

      <div style={styles.steps}>
        {STEPS.map(({ icon, text }) => (
          <div key={text} style={styles.step}>
            <span style={styles.stepIcon}>{icon}</span>
            <span style={styles.stepText}>{text}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      <button
        style={styles.btn}
        onClick={onStart}
        disabled={isRequesting}
      >
        {isRequesting ? 'Aguardando permissão...' : 'Iniciar análise'}
      </button>
    </div>
  )
}
