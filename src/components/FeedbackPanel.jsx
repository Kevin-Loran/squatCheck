/**
 * FeedbackPanel — Dia 3
 * Displays real-time squat analysis feedback.
 *
 * feedback shape:
 * {
 *   status:   'idle' | 'loading' | 'no_pose' | 'detecting' | 'good' | 'warning' | 'error'
 *   errors:   string[]
 *   messages: string[]
 *   angles:   { knee?, trunk? }
 *   depth:    'standing' | 'shallow' | 'parallel' | 'deep'
 * }
 */

const C = {
  good:    '#00ff88',
  warning: '#ffc800',
  error:   '#ff5050',
  neutral: 'rgba(255,255,255,0.55)',
  bg:      'rgba(0,0,0,0.60)',
  border:  'rgba(255,255,255,0.10)',
}

const styles = {
  panel: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 72,
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    pointerEvents: 'none',
  },
  angleRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  msgList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
}

function chip(bg, textColor, children) {
  return {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    background: bg,
    color: textColor,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '0.5px solid rgba(255,255,255,0.15)',
  }
}

function dotStyle(color) {
  return { width: 7, height: 7, borderRadius: '50%', background: color }
}

function badgeStyle(color) {
  return {
    background: C.bg,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 12,
    color: color,
    fontFamily: 'monospace',
    fontWeight: 600,
    border: `1px solid ${color}44`,
  }
}

function depthBadgeStyle(color) {
  return {
    alignSelf: 'flex-start',
    padding: '3px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}55`,
  }
}

function msgStyle(isError) {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 7,
    background: C.bg,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    padding: '6px 10px',
    borderRadius: 8,
    fontSize: 12,
    color: '#fff',
    border: `0.5px solid ${isError ? 'rgba(255,80,80,0.35)' : C.border}`,
    lineHeight: 1.4,
  }
}

function getChipConfig(status) {
  switch (status) {
    case 'loading':
      return { label: 'Carregando IA...', bg: 'rgba(255,255,255,0.12)', dot: C.neutral, text: 'rgba(255,255,255,0.75)' }
    case 'no_pose':
      return { label: 'Nenhuma pose detectada', bg: 'rgba(255,255,255,0.10)', dot: C.neutral, text: 'rgba(255,255,255,0.6)' }
    case 'detecting':
      return { label: 'Detectando...', bg: 'rgba(255,200,0,0.18)', dot: C.warning, text: C.warning }
    case 'good':
    case 'analyzing':
      return { label: 'Analisando', bg: 'rgba(0,255,136,0.18)', dot: C.good, text: C.good }
    case 'warning':
      return { label: 'Corrija a postura', bg: 'rgba(255,200,0,0.18)', dot: C.warning, text: C.warning }
    case 'error':
      return { label: 'Erro detectado', bg: 'rgba(255,80,80,0.18)', dot: C.error, text: C.error }
    default:
      return { label: 'Aguardando...', bg: 'rgba(255,255,255,0.08)', dot: C.neutral, text: 'rgba(255,255,255,0.5)' }
  }
}

const DEPTH_LABELS = {
  standing: { label: 'Em pé',       color: C.neutral },
  shallow:  { label: 'Raso',        color: C.error   },
  parallel: { label: 'Paralelo',    color: C.warning },
  deep:     { label: 'Profundo ✓',  color: C.good    },
}

function kneeColor(angle) {
  if (angle == null) return C.neutral
  if (angle <= 110)  return C.good
  if (angle <= 130)  return C.warning
  return C.error
}

function trunkColor(angle) {
  if (angle == null) return C.neutral
  return angle > 50 ? C.error : C.good
}

export default function FeedbackPanel({ feedback }) {
  if (!feedback) return null
  const { status = 'idle', messages = [], angles = {}, depth } = feedback
  if (status === 'idle') return null

  const cc = getChipConfig(status)
  const dCfg = depth ? (DEPTH_LABELS[depth] ?? null) : null
  const hasAngles = angles.knee != null || angles.trunk != null

  return (
    <div style={styles.panel}>
      <div style={chip(cc.bg, cc.text)}>
        <div style={dotStyle(cc.dot)} />
        {cc.label}
      </div>

      {hasAngles && (
        <div style={styles.angleRow}>
          {angles.knee != null && (
            <div style={badgeStyle(kneeColor(angles.knee))}>
              Joelho: {Math.round(angles.knee)}°
            </div>
          )}
          {angles.trunk != null && (
            <div style={badgeStyle(trunkColor(angles.trunk))}>
              Tronco: {Math.round(angles.trunk)}°
            </div>
          )}
        </div>
      )}

      {dCfg && dCfg.label && (
        <div style={depthBadgeStyle(dCfg.color)}>
          {dCfg.label}
        </div>
      )}

      {messages.length > 0 && (
        <div style={styles.msgList}>
          {messages.map((msg, i) => {
            const isError = msg.startsWith('Agache') || msg.startsWith('Tronco') || msg.startsWith('Base') || msg.startsWith('Joelhos')
            return (
              <div key={i} style={msgStyle(isError)}>
                <span style={{ fontSize: 13, color: isError ? C.error : C.good, flexShrink: 0, marginTop: 1 }}>
                  {isError ? '⚠' : '✓'}
                </span>
                {msg}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
