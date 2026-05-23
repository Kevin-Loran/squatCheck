/**
 * useSquatAnalysis — Dia 3
 * Receives MediaPipe landmarks and returns real-time squat analysis:
 *   - knee angle (left & right)
 *   - trunk tilt angle
 *   - squat depth classification
 *   - form errors
 *   - colored feedback messages
 *
 * MediaPipe Pose landmark indices (used here):
 *   11 = left shoulder   12 = right shoulder
 *   23 = left hip        24 = right hip
 *   25 = left knee       26 = right knee
 *   27 = left ankle      28 = right ankle
 */

// ─── Thresholds ──────────────────────────────────────────────────────────────

const KNEE_DEPTH_GOOD      = 120  // ≤ this = deep enough squat
const KNEE_DEPTH_PARALLEL  = 135  // ≤ this = parallel (acceptable)
const TRUNK_LEAN_MAX       = 50   // degrees from vertical — more = excessive lean
const MIN_VISIBILITY       = 0.4  // ignore landmarks below this confidence
const WIDE_STANCE_RATIO    = 1.35 // ankleWidth / shoulderWidth threshold
const WIDE_STANCE_MARGIN   = 0.06 // ankle beyond shoulder edge (normalized units)
const WIDE_STANCE_SLOPE    = 0.42 // max lateral slope (deltaX/deltaY) for hip→ankle
const KNEE_VALGUS_RATIO    = 0.55 // kneeWidth / ankleWidth — below this = knees caving in

// ─── Math helpers ────────────────────────────────────────────────────────────

/** Angle (degrees) at point B formed by A–B–C */
function angleBetween(A, B, C) {
  const BA = { x: A.x - B.x, y: A.y - B.y }
  const BC = { x: C.x - B.x, y: C.y - B.y }
  const dot = BA.x * BC.x + BA.y * BC.y
  const magBA = Math.hypot(BA.x, BA.y)
  const magBC = Math.hypot(BC.x, BC.y)
  if (magBA === 0 || magBC === 0) return null
  const cosine = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return (Math.acos(cosine) * 180) / Math.PI
}

/** Mid-point between two landmarks */
function midpoint(A, B) {
  return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
}

/** Angle of a segment relative to vertical (0° = straight up) */
function angleToVertical(top, bottom) {
  const dx = bottom.x - top.x
  const dy = bottom.y - top.y
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI
}

/** Check that all required landmarks are visible enough */
function allVisible(landmarks, indices) {
  return indices.every(i => (landmarks[i]?.visibility ?? 0) >= MIN_VISIBILITY)
}

// ─── Main analysis function ───────────────────────────────────────────────────

export function analyzeSquat(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return null
  }

  const L_SHOULDER = 11, R_SHOULDER = 12
  const L_HIP = 23,      R_HIP = 24
  const L_KNEE = 25,     R_KNEE = 26
  const L_ANKLE = 27,    R_ANKLE = 28

  // ── Knee angle ──────────────────────────────────────────────────────────────
  let kneeAngle = null

  const leftKneeVisible  = allVisible(landmarks, [L_HIP, L_KNEE, L_ANKLE])
  const rightKneeVisible = allVisible(landmarks, [R_HIP, R_KNEE, R_ANKLE])

  let leftKneeAngle  = null
  let rightKneeAngle = null

  if (leftKneeVisible) {
    leftKneeAngle = angleBetween(landmarks[L_HIP], landmarks[L_KNEE], landmarks[L_ANKLE])
  }
  if (rightKneeVisible) {
    rightKneeAngle = angleBetween(landmarks[R_HIP], landmarks[R_KNEE], landmarks[R_ANKLE])
  }

  // Use the side with best visibility; prefer the smaller angle (deeper)
  if (leftKneeAngle !== null && rightKneeAngle !== null) {
    kneeAngle = Math.min(leftKneeAngle, rightKneeAngle)
  } else {
    kneeAngle = leftKneeAngle ?? rightKneeAngle
  }

  // ── Trunk angle ─────────────────────────────────────────────────────────────
  let trunkAngle = null
  const trunkVisible = allVisible(landmarks, [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP])

  if (trunkVisible) {
    const shoulderMid = midpoint(landmarks[L_SHOULDER], landmarks[R_SHOULDER])
    const hipMid      = midpoint(landmarks[L_HIP],      landmarks[R_HIP])
    trunkAngle = angleToVertical(shoulderMid, hipMid)
  }

  // ── Depth classification ─────────────────────────────────────────────────────
  let depth = 'unknown'      // 'standing' | 'shallow' | 'parallel' | 'deep'
  if (kneeAngle !== null) {
    if (kneeAngle > 160)               depth = 'standing'
    else if (kneeAngle > KNEE_DEPTH_PARALLEL) depth = 'shallow'
    else if (kneeAngle > KNEE_DEPTH_GOOD)     depth = 'parallel'
    else                               depth = 'deep'
  }

  // ── Trunk lean check ────────────────────────────────────────────────────────
  const excessiveLean = trunkAngle !== null && trunkAngle > TRUNK_LEAN_MAX

  // ── Wide stance check ────────────────────────────────────────────────────────
  let wideStance = false
  const stanceVisible = allVisible(landmarks, [L_SHOULDER, R_SHOULDER, L_ANKLE, R_ANKLE])

  if (stanceVisible) {
    const leftShoulder  = landmarks[L_SHOULDER]
    const rightShoulder = landmarks[R_SHOULDER]
    const leftAnkle     = landmarks[L_ANKLE]
    const rightAnkle    = landmarks[R_ANKLE]

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x)
    const ankleWidth    = Math.abs(rightAnkle.x - leftAnkle.x)

    if (ankleWidth > shoulderWidth * WIDE_STANCE_RATIO) wideStance = true
    if (leftAnkle.x  < leftShoulder.x  - WIDE_STANCE_MARGIN) wideStance = true
    if (rightAnkle.x > rightShoulder.x + WIDE_STANCE_MARGIN) wideStance = true

    // Slope check: hip→ankle lateral deviation catches frontal-camera perspective distortion
    const slopeVisible = allVisible(landmarks, [L_HIP, R_HIP])
    if (slopeVisible) {
      const leftHip  = landmarks[L_HIP]
      const rightHip = landmarks[R_HIP]

      const leftLegSlope  = Math.abs(leftAnkle.x  - leftHip.x)  / Math.max(Math.abs(leftAnkle.y  - leftHip.y),  0.001)
      const rightLegSlope = Math.abs(rightAnkle.x - rightHip.x) / Math.max(Math.abs(rightAnkle.y - rightHip.y), 0.001)

      if (leftLegSlope  > WIDE_STANCE_SLOPE) wideStance = true
      if (rightLegSlope > WIDE_STANCE_SLOPE) wideStance = true
    }
  }

  // ── Knee valgus check ────────────────────────────────────────────────────────
  let kneeValgus = false
  if (depth !== 'standing') {
    const valgusVisible = allVisible(landmarks, [L_KNEE, R_KNEE, L_ANKLE, R_ANKLE])
    if (valgusVisible) {
      const kneeWidth  = Math.abs(landmarks[L_KNEE].x - landmarks[R_KNEE].x)
      const ankleWidth = Math.abs(landmarks[L_ANKLE].x - landmarks[R_ANKLE].x)
      if (kneeWidth < ankleWidth * KNEE_VALGUS_RATIO) kneeValgus = true
    }
  }

  // ── Build errors & feedback ─────────────────────────────────────────────────
  const errors   = []   // short error strings for FeedbackPanel
  const messages = []   // human-readable tips

  if (kneeAngle !== null) {
    if (depth === 'shallow') {
      errors.push('depth')
      messages.push('Agache mais — aprofunde o movimento')
    } else if (depth === 'parallel') {
      messages.push('Boa profundidade')
    } else if (depth === 'deep') {
      messages.push('✓ Profundidade excelente!')
    }
  }

  if (excessiveLean) {
    errors.push('trunk')
    messages.push('Tronco muito inclinado — erga o peito')
  } else if (trunkAngle !== null && depth !== 'standing') {
    messages.push('✓ Tronco bem posicionado')
  }

  if (depth === 'standing' && kneeAngle !== null) {
    messages.length = 0
    messages.push('Em pé — inicie o agachamento')
  }

  // wideStance pushed AFTER standing-reset so it is never wiped
  if (wideStance) {
    errors.push('wideStance')
    messages.push('Base muito aberta — aproxime os pés')
  }

  // kneeValgus pushed AFTER standing-reset so it is never wiped
  if (kneeValgus) {
    errors.push('kneeValgus')
    messages.push('Joelhos muito próximos — empurre os joelhos para fora')
  }

  // ── Overall status ──────────────────────────────────────────────────────────
  let overallStatus = 'good'   // 'good' | 'warning' | 'error'
  if (errors.length > 0)         overallStatus = 'error'
  else if (depth === 'parallel') overallStatus = 'warning'

  return {
    kneeAngle,
    leftKneeAngle,
    rightKneeAngle,
    trunkAngle,
    depth,
    excessiveLean,
    wideStance,
    kneeValgus,
    errors,
    messages,
    overallStatus,
    // Pass through for canvas drawing
    landmarks,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

import { useMemo, useRef } from 'react'

export function useSquatAnalysis(landmarks) {
  const prevAngleRef = useRef(null)
  const phaseRef     = useRef('standing')
  const prevDepthRef = useRef('standing')

  return useMemo(() => {
    const analysis = analyzeSquat(landmarks)
    if (!analysis) {
      prevAngleRef.current = null
      return null
    }

    const { kneeAngle } = analysis

    // ── Phase detection ──────────────────────────────────────────────────────
    const prevAngle = prevAngleRef.current
    let phase = phaseRef.current

    if (kneeAngle !== null) {
      if (kneeAngle > 155) {
        phase = 'standing'
      } else if (prevAngle !== null) {
        const delta = kneeAngle - prevAngle
        if      (delta < -2)                                   phase = 'descending'
        else if (delta >  2)                                   phase = 'ascending'
        else if (Math.abs(delta) < 1 && kneeAngle < 140)      phase = 'bottom'
        // ambiguous delta → keep previous phase
      }
      prevAngleRef.current = kneeAngle
    }
    phaseRef.current = phase

    // ── Depth hysteresis ─────────────────────────────────────────────────────
    // Prevents flicker at the shallow/parallel boundary (~130°)
    const prevDepth = prevDepthRef.current
    let depth = analysis.depth

    if (prevDepth !== 'shallow' && depth === 'shallow') {
      // Only enter shallow if angle is clearly above 140° (not just past 135°)
      if (kneeAngle !== null && kneeAngle <= 140) depth = prevDepth
    } else if (prevDepth === 'shallow' && depth !== 'shallow') {
      // Only exit shallow if angle is clearly below 130°
      if (kneeAngle !== null && kneeAngle >= 130) depth = 'shallow'
    }
    prevDepthRef.current = depth

    // ── Suppress depth feedback during descent ───────────────────────────────
    let errors   = [...analysis.errors]
    let messages = [...analysis.messages]

    if (phase === 'descending') {
      errors   = errors.filter(e => e !== 'depth')
      messages = messages.filter(m =>
        !m.startsWith('Agache') &&
        !m.startsWith('Boa profundidade') &&
        !m.startsWith('✓ Profundidade')
      )
    }

    // Recompute overall status from the final (post-filter) errors and depth
    const overallStatus =
      errors.length > 0    ? 'error'   :
      depth === 'parallel' ? 'warning' : 'good'

    return { ...analysis, depth, phase, errors, messages, overallStatus }
  }, [landmarks])
}
