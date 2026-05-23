import { useState, useRef, useCallback, useEffect } from 'react'

export const CAMERA_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  ERROR: 'error',
  DENIED: 'denied',
}

export function useCamera() {
  const [status, setStatus] = useState(CAMERA_STATUS.IDLE)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment') // rear camera on mobile
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async (mode = facingMode) => {
    stopStream()
    setStatus(CAMERA_STATUS.REQUESTING)
    setError(null)

    const constraints = {
      video: {
        facingMode: mode,
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStatus(CAMERA_STATUS.ACTIVE)
      }
    } catch (err) {
      stopStream()

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus(CAMERA_STATUS.DENIED)
        setError('Permissão de câmera negada. Habilite nas configurações do navegador.')
      } else if (err.name === 'NotFoundError') {
        setStatus(CAMERA_STATUS.ERROR)
        setError('Nenhuma câmera encontrada neste dispositivo.')
      } else if (err.name === 'NotReadableError') {
        setStatus(CAMERA_STATUS.ERROR)
        setError('Câmera está sendo usada por outro app. Feche e tente novamente.')
      } else if (err.name === 'OverconstrainedError') {
        // Retry with relaxed constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          })
          streamRef.current = fallbackStream
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream
            await videoRef.current.play()
            setStatus(CAMERA_STATUS.ACTIVE)
          }
        } catch {
          setStatus(CAMERA_STATUS.ERROR)
          setError('Não foi possível acessar a câmera com essas configurações.')
        }
      } else {
        setStatus(CAMERA_STATUS.ERROR)
        setError(`Erro ao acessar câmera: ${err.message}`)
      }
    }
  }, [facingMode, stopStream])

  const flipCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
    startCamera(newMode)
  }, [facingMode, startCamera])

  const getVideoSize = useCallback(() => {
    const video = videoRef.current
    if (!video) return { width: 0, height: 0 }
    return {
      width: video.videoWidth,
      height: video.videoHeight,
    }
  }, [])

  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  return {
    videoRef,
    status,
    error,
    facingMode,
    startCamera,
    stopStream,
    flipCamera,
    getVideoSize,
    isActive: status === CAMERA_STATUS.ACTIVE,
  }
}
