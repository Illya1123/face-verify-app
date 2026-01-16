import { useEffect, useRef } from 'react'
import { useCameraControl } from './camera/useCameraControl'
import { useCameraCapture } from './camera/useCameraCapture'
import { useFaceDetection } from './camera/useFaceDetection'

interface UseCameraPreviewProps {
  onCapture: (base64Image: string) => void
  onClose: () => void
}

export const useCameraPreview = ({ onCapture, onClose }: UseCameraPreviewProps) => {
  const isWebCameraRef = useRef(false)
  const needsRotationRef = useRef(false)

  // Camera control
  const cameraControl = useCameraControl()
  const {
    isActive,
    isCheckingPermission,
    permissionGranted,
    permissionDenied,
    currentCamera,
    availableCameras,
    isWebCamera,
    cameraDevices,
    currentDeviceId,
    videoRef,
    needsRotation,
    startCamera,
    stopCameraSafe,
    startWebCamera,
    stopWebCamera,
    handleFlipCamera,
    handleSwitchCamera,
    handleSwitchWebCamera,
    handleRetryPermission,
    initCamera,
  } = cameraControl

  // Update refs
  useEffect(() => {
    isWebCameraRef.current = isWebCamera
  }, [isWebCamera])

  useEffect(() => {
    needsRotationRef.current = needsRotation
  }, [needsRotation])

  // Camera capture
  const capture = useCameraCapture(videoRef, needsRotationRef, isWebCameraRef)
  const {
    isCapturing,
    capturingRef,
    captureFromWebCamera,
    handleNativeCapture,
    handleCaptureInternal,
  } = capture

  // Face detection
  const faceDetection = useFaceDetection(
    videoRef,
    isWebCamera,
    isActive,
    needsRotation,
    captureFromWebCamera,
    handleNativeCapture,
    onCapture,
    capturingRef
  )

  const { faceDetected } = faceDetection

  // Initialize camera on mount
  useEffect(() => {
    initCamera()

    return () => {
      stopCameraSafe()
      stopWebCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle manual capture
  const handleCapture = () => {
    handleCaptureInternal(
      onCapture,
      stopWebCamera,
      stopCameraSafe,
      permissionGranted,
      isActive
    )
  }

  // Handle close
  const handleClose = async () => {
    if (isWebCamera) {
      stopWebCamera()
    } else {
      await stopCameraSafe()
    }
    onClose()
  }

  return {
    // State
    isActive,
    isCapturing,
    isCheckingPermission,
    permissionGranted,
    permissionDenied,
    currentCamera,
    availableCameras,
    isWebCamera,
    cameraDevices,
    currentDeviceId,
    videoRef,
    faceDetected,
    // Actions
    handleCapture,
    handleFlipCamera,
    handleSwitchCamera,
    handleSwitchWebCamera,
    handleRetryPermission,
    handleClose,
  }
}
