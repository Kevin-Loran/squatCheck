import { useEffect, useRef, useCallback, useState } from 'react'
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import { analyzeSquat } from './useSquatAnalysis'
import { drawSquatFeedback } from '../utils/drawSquatFeedback'

export const POSE_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  DETECTING: 'detecting',
  ERROR: 'error',
}

// Connections subset: full body skeleton
// MediaPipe Pose has 33 landmarks — we use the standard POSE_CONNECTIONS
const POSE_CONNECTIONS = PoseLandmarker?.POSE_CONNECTIONS ?? []

export function usePoseLandmarker(videoRef, canvasRef, { enabled = false } = {}) {
  const [poseStatus, setPoseStatus] = useState(POSE_STATUS.LOADING)
  const [landmarks, setLandmarks] = useState(null)
  const [squatAnalysis, setSquatAnalysis] = useState(null)

  const landmarkerRef = useRef(null)
  const rafRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  // Keep a stable ref so the RAF loop always sees the latest value
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // ─── Init MediaPipe ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setPoseStatus(POSE_STATUS.LOADING)

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        if (cancelled) {
          landmarker.close()
          return
        }

        landmarkerRef.current = landmarker
        setPoseStatus(POSE_STATUS.READY)
      } catch (err) {
        if (!cancelled) {
          console.error('[usePoseLandmarker] init error:', err)
          setPoseStatus(POSE_STATUS.ERROR)
        }
      }
    }

    init()
    return () => {
      cancelled = true
      if (landmarkerRef.current) {
        landmarkerRef.current.close()
        landmarkerRef.current = null
      }
    }
  }, [])

  // ─── RAF detection loop ────────────────────────────────────────────────────
  const detectFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = landmarkerRef.current

    if (!enabledRef.current || !video || !canvas || !landmarker) {
      rafRef.current = requestAnimationFrame(detectFrame)
      return
    }

    if (video.readyState < 2 || video.paused || video.ended) {
      rafRef.current = requestAnimationFrame(detectFrame)
      return
    }

    // Sync canvas size to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    const ctx = canvas.getContext('2d')

    // Only process a new frame
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime

      setPoseStatus(POSE_STATUS.DETECTING)

      try {
        const result = landmarker.detectForVideo(video, performance.now())

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (result.landmarks?.length > 0) {
          const lms = result.landmarks[0]
          setLandmarks(lms)

          // Dia 3: squat analysis
          const analysis = analyzeSquat(lms)
          setSquatAnalysis(analysis)

          drawPose(ctx, canvas, lms, analysis)
          drawSquatFeedback(ctx, canvas, analysis)
        } else {
          setLandmarks(null)
          setSquatAnalysis(null)
        }
      } catch (err) {
        console.warn('[usePoseLandmarker] detect error:', err)
      }
    }

    rafRef.current = requestAnimationFrame(detectFrame)
  }, [videoRef, canvasRef])

  // Start / stop RAF based on enabled flag
  useEffect(() => {
    if (poseStatus !== POSE_STATUS.READY && poseStatus !== POSE_STATUS.DETECTING) return

    rafRef.current = requestAnimationFrame(detectFrame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [poseStatus, detectFrame])

  // Clear canvas when disabled
  useEffect(() => {
    if (!enabled) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
      setLandmarks(null)
      setSquatAnalysis(null)
    }
  }, [enabled, canvasRef])

  return { poseStatus, landmarks, squatAnalysis }
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

const POINT_COLOR = '#00ff88'
const POINT_GLOW  = 'rgba(0,255,136,0.9)'
const LINE_COLOR  = 'rgba(0,255,136,0.55)'
const LINE_WIDTH  = 2.5
const POINT_RADIUS = 5

// MediaPipe POSE_CONNECTIONS is available as a static property after import
// We hard-code the standard pairs here as a safe fallback
const CONNECTIONS = [
  // Face
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],
  // Torso
  [11,12],[11,23],[12,24],[23,24],
  // Left arm
  [11,13],[13,15],[15,17],[17,19],[19,15],[15,21],
  // Right arm
  [12,14],[14,16],[16,18],[18,20],[20,16],[16,22],
  // Left leg
  [23,25],[25,27],[27,29],[29,31],[31,27],
  // Right leg
  [24,26],[26,28],[28,30],[30,32],[32,28],
]

function drawPose(ctx, canvas, landmarks, analysis) {
  const { width, height } = canvas

  const toAbs = (lm) => ({
    x: lm.x * width,
    y: lm.y * height,
    v: lm.visibility ?? 1,
  })

  // Lines
  ctx.lineCap = 'round'
  ctx.lineWidth = LINE_WIDTH
  ctx.strokeStyle = LINE_COLOR

  for (const [a, b] of CONNECTIONS) {
    const ptA = landmarks[a]
    const ptB = landmarks[b]
    if (!ptA || !ptB) continue
    if ((ptA.visibility ?? 1) < 0.3 || (ptB.visibility ?? 1) < 0.3) continue

    const { x: ax, y: ay } = toAbs(ptA)
    const { x: bx, y: by } = toAbs(ptB)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  // Points
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue
    const { x, y } = toAbs(lm)

    ctx.shadowColor = POINT_GLOW
    ctx.shadowBlur = 8
    ctx.fillStyle = POINT_COLOR
    ctx.beginPath()
    ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur = 0
}
