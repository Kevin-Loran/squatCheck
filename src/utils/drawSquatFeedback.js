/**
 * drawSquatFeedback — Dia 3
 * Draws squat-analysis overlays on the canvas:
 *   - Knee angle badge (color-coded)
 *   - Trunk line (green/red)
 *   - Colored knee joints
 *
 * Called from usePoseLandmarker after the base skeleton is drawn.
 */

const COLORS = {
  good:    '#00ff88',
  warning: '#ffc800',
  error:   '#ff4444',
  neutral: 'rgba(255,255,255,0.7)',
  badgeBg: 'rgba(0,0,0,0.65)',
}

/** Convert normalized landmark to canvas pixel coords */
function px(lm, canvas) {
  return { x: lm.x * canvas.width, y: lm.y * canvas.height }
}

/** Mid-point in canvas coords */
function mid(a, b, canvas) {
  return {
    x: ((a.x + b.x) / 2) * canvas.width,
    y: ((a.y + b.y) / 2) * canvas.height,
  }
}

/**
 * Draw a pill badge at (cx, cy) with angle value.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} angle  — degrees
 * @param {string} color
 */
function drawAngleBadge(ctx, cx, cy, angle, color) {
  const text = `${Math.round(angle)}°`
  const padX = 10, padY = 5
  ctx.font = 'bold 14px monospace'
  const textW = ctx.measureText(text).width
  const w = textW + padX * 2
  const h = 22

  const x = cx - w / 2
  const y = cy - h / 2

  // Background pill
  ctx.fillStyle = COLORS.badgeBg
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()

  // Colored border
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.stroke()

  // Text
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy + 1)
}

/**
 * Draw a highlighted circle on a joint.
 */
function drawJoint(ctx, x, y, color, radius = 7) {
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

/**
 * Main export — call this after drawPose().
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {object} analysis  — result from analyzeSquat()
 */
export function drawSquatFeedback(ctx, canvas, analysis) {
  if (!analysis || !canvas || !ctx) return

  const {
    landmarks,
    kneeAngle,
    trunkAngle,
    depth,
    excessiveLean,
    wideStance,
    kneeValgus,
    overallStatus,
    errors,
  } = analysis

  const lms = landmarks
  const MIN_VIS = 0.4

  // ── Color scheme based on overall status ──────────────────────────────────
  const kneeColor =
    kneeValgus           ? COLORS.error   :
    depth === 'deep'     ? COLORS.good    :
    depth === 'parallel' ? COLORS.warning :
    depth === 'shallow'  ? COLORS.error   : COLORS.neutral

  const trunkColor = excessiveLean ? COLORS.error : COLORS.good

  // ── Knee joints & angle badge ──────────────────────────────────────────────
  const kneeIndices = [
    { hip: 23, knee: 25, ankle: 27 },
    { hip: 24, knee: 26, ankle: 28 },
  ]

  for (const { hip, knee, ankle } of kneeIndices) {
    const lHip   = lms[hip]
    const lKnee  = lms[knee]
    const lAnkle = lms[ankle]
    if (!lHip || !lKnee || !lAnkle) continue
    if (
      (lHip.visibility   ?? 0) < MIN_VIS ||
      (lKnee.visibility  ?? 0) < MIN_VIS ||
      (lAnkle.visibility ?? 0) < MIN_VIS
    ) continue

    const pKnee = px(lKnee, canvas)

    // Highlight the knee joint
    drawJoint(ctx, pKnee.x, pKnee.y, kneeColor, 8)
  }

  // ── Knee angle badge — placed above the knee midpoint ─────────────────────
  if (kneeAngle !== null) {
    // Prefer the more-visible side for badge placement
    const useLeft  = (lms[25]?.visibility ?? 0) >= MIN_VIS
    const useRight = (lms[26]?.visibility ?? 0) >= MIN_VIS
    let badgeTarget = null

    if (useLeft && useRight) {
      // Place between both knees
      badgeTarget = mid(lms[25], lms[26], canvas)
    } else if (useLeft) {
      badgeTarget = px(lms[25], canvas)
    } else if (useRight) {
      badgeTarget = px(lms[26], canvas)
    }

    if (badgeTarget) {
      drawAngleBadge(ctx, badgeTarget.x, badgeTarget.y - 28, kneeAngle, kneeColor)
    }
  }

  // ── Ankle joints — highlighted when wide stance detected ──────────────────
  if (wideStance) {
    for (const idx of [27, 28]) {
      const lm = lms[idx]
      if (!lm || (lm.visibility ?? 0) < MIN_VIS) continue
      const p = px(lm, canvas)
      drawJoint(ctx, p.x, p.y, COLORS.warning, 9)
    }
  }

  // ── Trunk line ─────────────────────────────────────────────────────────────
  const lShoulder = lms[11], rShoulder = lms[12]
  const lHip      = lms[23], rHip      = lms[24]

  const shoulderVis = (lShoulder?.visibility ?? 0) >= MIN_VIS || (rShoulder?.visibility ?? 0) >= MIN_VIS
  const hipVis      = (lHip?.visibility ?? 0) >= MIN_VIS      || (rHip?.visibility ?? 0) >= MIN_VIS

  if (shoulderVis && hipVis && lShoulder && rShoulder && lHip && rHip) {
    const shoulderMid = mid(lShoulder, rShoulder, canvas)
    const hipMid      = mid(lHip,      rHip,      canvas)

    ctx.strokeStyle = trunkColor
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.setLineDash([6, 4])
    ctx.shadowColor = trunkColor
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(shoulderMid.x, shoulderMid.y)
    ctx.lineTo(hipMid.x, hipMid.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0

    // Trunk angle badge (small)
    if (trunkAngle !== null) {
      const midY = (shoulderMid.y + hipMid.y) / 2
      const midX = (shoulderMid.x + hipMid.x) / 2
      drawAngleBadge(ctx, midX + 28, midY, trunkAngle, trunkColor)
    }
  }
}
