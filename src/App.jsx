import { useCallback } from 'react'
import { useCamera, CAMERA_STATUS } from './hooks/useCamera'
import { useCanvas } from './hooks/useCanvas'
import { usePoseLandmarker, POSE_STATUS } from './hooks/usePoseLandmarker'
import CameraView from './components/CameraView'
import StartScreen from './components/StartScreen'
import FeedbackPanel from './components/FeedbackPanel'

const styles = {
  app: {
    position: 'fixed',
    inset: 0,
    background: '#0a0a0a',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 30,
  },
}

export default function App() {
  const {
    videoRef,
    status,
    error,
    startCamera,
    flipCamera,
    isActive,
  } = useCamera()

  const { canvasRef } = useCanvas(videoRef)

  // Dia 2: pose detection — only runs while camera is active
  const { poseStatus, landmarks, squatAnalysis } = usePoseLandmarker(videoRef, canvasRef, {
    enabled: isActive,
  })

  const handleStart = useCallback(() => {
    startCamera()
  }, [startCamera])

  // Dia 3: build rich feedback from squat analysis
  const feedback = (() => {
    if (!isActive) return { status: 'idle', errors: [], messages: [], angles: {} }

    if (poseStatus === POSE_STATUS.LOADING) {
      return { status: 'loading', errors: [], messages: [], angles: {} }
    }

    if (!landmarks) {
      return { status: 'no_pose', errors: [], messages: [], angles: {} }
    }

    if (!squatAnalysis) {
      return { status: 'detecting', errors: [], messages: [], angles: {} }
    }

    return {
      status: squatAnalysis.overallStatus === 'good' ? 'analyzing' : squatAnalysis.overallStatus,
      errors: squatAnalysis.errors,
      messages: squatAnalysis.messages,
      angles: {
        ...(squatAnalysis.kneeAngle  != null ? { knee:  squatAnalysis.kneeAngle  } : {}),
        ...(squatAnalysis.trunkAngle != null ? { trunk: squatAnalysis.trunkAngle } : {}),
      },
      depth: squatAnalysis.depth,
      landmarks,
    }
  })()

  return (
    <div style={styles.app}>
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        isActive={isActive}
        onFlip={flipCamera}
        showGuide
      />

      {isActive && <FeedbackPanel feedback={feedback} />}

      {!isActive && (
        <div style={styles.overlay}>
          <StartScreen
            onStart={handleStart}
            error={error}
            isRequesting={status === CAMERA_STATUS.REQUESTING}
          />
        </div>
      )}
    </div>
  )
}
