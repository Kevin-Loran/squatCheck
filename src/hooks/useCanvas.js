import { useRef, useCallback, useEffect } from 'react'

export function useCanvas(videoRef) {
  const canvasRef = useRef(null)

  // Syncs canvas resolution to the actual video dimensions
  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return false

    const { videoWidth, videoHeight } = video
    if (videoWidth === 0 || videoHeight === 0) return false

    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth
      canvas.height = videoHeight
    }
    return true
  }, [videoRef])

  // Returns a 2D context ready to draw on
  const getContext = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  // Clears the entire canvas
  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  // Draw skeleton: landmarks array of {x, y} normalized (0-1)
  // and connections array of [indexA, indexB]
  const drawSkeleton = useCallback((landmarks, connections, options = {}) => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!ctx || !canvas || !landmarks?.length) return

    const {
      pointColor = '#00ff88',
      lineColor = 'rgba(0, 255, 136, 0.6)',
      pointRadius = 6,
      lineWidth = 2,
      highlightIndices = [],
      highlightColor = '#ff4444',
    } = options

    const toAbsolute = ({ x, y }) => ({
      ax: x * canvas.width,
      ay: y * canvas.height,
    })

    // Draw connections first (behind points)
    if (connections?.length) {
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'

      connections.forEach(([a, b]) => {
        const ptA = landmarks[a]
        const ptB = landmarks[b]
        if (!ptA || !ptB) return
        if (ptA.visibility < 0.3 || ptB.visibility < 0.3) return

        const { ax, ay } = toAbsolute(ptA)
        const { ax: bx, ay: by } = toAbsolute(ptB)

        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
      })
    }

    // Draw landmark points
    landmarks.forEach((pt, idx) => {
      if (pt.visibility < 0.3) return

      const { ax, ay } = toAbsolute(pt)
      const isHighlighted = highlightIndices.includes(idx)
      const color = isHighlighted ? highlightColor : pointColor

      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(ax, ay, isHighlighted ? pointRadius + 2 : pointRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }, [getContext])

  // Draw angle arc and label at a joint
  const drawAngle = useCallback((vertex, angle, options = {}) => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!ctx || !canvas) return

    const { color = '#ffffff', fontSize = 14 } = options
    const x = vertex.x * canvas.width
    const y = vertex.y * canvas.height

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.roundRect(x - 22, y - 24, 44, 22, 4)
    ctx.fill()

    ctx.fillStyle = color
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.round(angle)}°`, x, y - 13)
  }, [getContext])

  return {
    canvasRef,
    syncCanvasSize,
    getContext,
    clear,
    drawSkeleton,
    drawAngle,
  }
}
