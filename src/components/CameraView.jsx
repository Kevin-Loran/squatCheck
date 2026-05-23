import { useEffect, useRef } from 'react'

const styles = {
  wrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: '#0a0a0a',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
  },
  flipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 10,
    touchAction: 'manipulation',
  },
  guideLine: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  guideBox: {
    width: '60%',
    aspectRatio: '1 / 2.2',
    border: '1.5px dashed rgba(0, 255, 136, 0.35)',
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    padding: '5px 12px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
    letterSpacing: '0.03em',
    zIndex: 10,
    border: '0.5px solid rgba(255,255,255,0.15)',
  },
}

export default function CameraView({
  videoRef,
  canvasRef,
  isActive,
  onFlip,
  showGuide = true,
}) {
  return (
    <div style={styles.wrapper}>
      <video
        ref={videoRef}
        style={{
          ...styles.video,
          transform: 'scaleX(-1)', // mirror front camera feel
        }}
        playsInline
        muted
        autoPlay
      />

      <canvas
        ref={canvasRef}
        style={{
          ...styles.canvas,
          transform: 'scaleX(-1)', // match the mirrored video
        }}
      />

      {/* Silhouette guide — helps user position themselves */}
      {isActive && showGuide && (
        <div style={styles.guideLine}>
          <div style={styles.guideBox} />
        </div>
      )}

      {/* Flip camera button */}
      {isActive && (
        <button
          style={styles.flipBtn}
          onClick={onFlip}
          aria-label="Alternar câmera"
        >
          ↻
        </button>
      )}

      {/* Camera angle reminder */}
      {isActive && (
        <div style={styles.badge}>
          📐 Posicione a câmera de lado · 2m de distância
        </div>
      )}
    </div>
  )
}
