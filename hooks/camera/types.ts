export type CameraPosition = 'front' | 'rear'

export interface CameraDevice {
  deviceId: string
  label: string
  position?: CameraPosition
}

export interface UseCameraControlReturn {
  isActive: boolean
  isCheckingPermission: boolean
  permissionGranted: boolean
  permissionDenied: boolean
  currentCamera: CameraPosition
  availableCameras: CameraPosition[]
  isWebCamera: boolean
  cameraDevices: CameraDevice[]
  currentDeviceId: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  needsRotation: boolean
  startCamera: (position?: CameraPosition) => Promise<void>
  stopCameraSafe: () => Promise<void>
  startWebCamera: (deviceId?: string) => Promise<void>
  stopWebCamera: () => void
  handleFlipCamera: () => Promise<void>
  handleSwitchCamera: (position: CameraPosition) => Promise<void>
  handleSwitchWebCamera: (deviceId: string) => Promise<void>
  handleRetryPermission: () => Promise<void>
}

export interface UseCameraCaptureReturn {
  isCapturing: boolean
  captureFromWebCamera: () => Promise<string>
  handleNativeCapture: () => Promise<string>
  handleCapture: () => void
}

export interface UseFaceDetectionReturn {
  faceDetected: boolean
  countdown: number | null
  isCountingDown: boolean
  startFaceDetection: () => void
  stopFaceDetection: () => void
}
