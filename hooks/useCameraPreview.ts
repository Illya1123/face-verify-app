import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import {
  CameraPreview,
  CameraPreviewOptions,
} from '@capacitor-community/camera-preview'

interface UseCameraPreviewProps {
  onCapture: (base64Image: string) => void
  onClose: () => void
}

type CameraPosition = 'front' | 'rear'

interface CameraDevice {
  deviceId: string
  label: string
  position?: CameraPosition
}

export const useCameraPreview = ({ onCapture, onClose }: UseCameraPreviewProps) => {
  const startedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isActive, setIsActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [currentCamera, setCurrentCamera] = useState<CameraPosition>('front')
  const [availableCameras, setAvailableCameras] = useState<CameraPosition[]>(['front'])
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('')
  const [isWebCamera, setIsWebCamera] = useState(false)

  /* =========================
     LIFECYCLE
     ========================= */
  useEffect(() => {
    initCamera()

    return () => {
      stopCameraSafe()
      stopWebCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =========================
     PERMISSION
     ========================= */
  const requestCameraPermission = async (): Promise<boolean> => {
    const result = await Camera.requestPermissions({
      permissions: ['camera'],
    })

    return result.camera === 'granted'
  }

  const initCamera = async () => {
    try {
      setIsCheckingPermission(true)

      if (!Capacitor.isNativePlatform()) {
        console.warn('Not native platform, using web camera')
        setIsWebCamera(true)
        await initWebCamera()
        return
      }

      const granted = await requestCameraPermission()

      if (!granted) {
        setPermissionDenied(true)
        return
      }

      setPermissionGranted(true)

      // Detect available cameras
      await detectAvailableCameras()

      await startCamera()
    } catch (err) {
      console.error('Init camera error:', err)
      setPermissionDenied(true)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  /* =========================
     DETECT CAMERAS
     ========================= */
  const detectAvailableCameras = async () => {
    try {
      // Thử start cả front và rear để detect
      const cameras: CameraPosition[] = []

      // Front camera luôn có
      cameras.push('front')

      // Thử detect rear camera
      try {
        await CameraPreview.start({
          position: 'rear',
          parent: 'capacitor-camera-preview',
          className: 'capacitor-camera-preview-view',
          toBack: true,
          width: 1,
          height: 1,
        })
        cameras.push('rear')
        await CameraPreview.stop()
        startedRef.current = false
      } catch {
        // Rear camera không có
      }

      setAvailableCameras(cameras)
    } catch (err) {
      console.error('Detect cameras error:', err)
      setAvailableCameras(['front'])
    }
  }

  /* =========================
     WEB CAMERA (USB/Webcam)
     ========================= */
  const initWebCamera = async () => {
    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())

      // Enumerate all video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      const cameras: CameraDevice[] = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))

      // Sort cameras: USB/External cameras first, built-in cameras last
      const sortedCameras = cameras.sort((a, b) => {
        const builtInKeywords = ['integrated', 'facetime', 'front', 'rear', 'webcam', 'built-in']
        const aIsBuiltIn = builtInKeywords.some(keyword =>
          a.label.toLowerCase().includes(keyword)
        )
        const bIsBuiltIn = builtInKeywords.some(keyword =>
          b.label.toLowerCase().includes(keyword)
        )

        // USB cameras (not built-in) come first
        if (!aIsBuiltIn && bIsBuiltIn) return -1
        if (aIsBuiltIn && !bIsBuiltIn) return 1
        return 0
      })

      console.log('Found cameras (USB first):', sortedCameras)
      setCameraDevices(sortedCameras)

      if (sortedCameras.length > 0) {
        setPermissionGranted(true)
        setCurrentDeviceId(sortedCameras[0].deviceId)
        await startWebCamera(sortedCameras[0].deviceId)
      } else {
        setPermissionDenied(true)
      }
    } catch (err) {
      console.error('Init web camera error:', err)
      setPermissionDenied(true)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  const startWebCamera = async (deviceId?: string) => {
    try {
      // Stop existing stream
      stopWebCamera()

      const targetDeviceId = deviceId || currentDeviceId
      console.log('Starting web camera with deviceId:', targetDeviceId)

      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : { facingMode: 'user' }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsActive(true)
        setCurrentDeviceId(targetDeviceId)
        console.log('Web camera started successfully')
      }
    } catch (err) {
      console.error('Start web camera error:', err)
      setPermissionDenied(true)
    }
  }

  const stopWebCamera = () => {
    try {
      if (streamRef.current) {
        console.log('Stopping web camera...')
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('Stopped track:', track.label)
        })
        streamRef.current = null
        setIsActive(false)
        console.log('Web camera stopped successfully')
      }
    } catch (err) {
      console.error('Stop web camera error:', err)
    }
  }

  /* =========================
     CAMERA CONTROL
     ========================= */
  const startCamera = async (position?: CameraPosition) => {
    if (startedRef.current) {
      await stopCameraSafe()
    }

    try {
      console.log('Starting camera...')
      const cameraPosition = position || currentCamera
      const options: CameraPreviewOptions = {
        position: cameraPosition,
        parent: 'capacitor-camera-preview',
        className: 'capacitor-camera-preview-view',
        toBack: true,
        enableZoom: true,
        width: window.innerWidth,
        height: window.innerHeight,
      }

      await CameraPreview.start(options)
      startedRef.current = true
      setIsActive(true)
      setCurrentCamera(cameraPosition)
      console.log('Camera started successfully')
    } catch (err) {
      console.error('Start camera error:', err)
      setPermissionDenied(true)
    }
  }

  const stopCameraSafe = async () => {
    try {
      if (startedRef.current) {
        console.log('Stopping camera...')
        await CameraPreview.stop()
        startedRef.current = false
        setIsActive(false)
        console.log('Camera stopped successfully')
      }
    } catch (err) {
      console.error('Stop camera error:', err)
    }
  }

  /* =========================
     IMAGE PROCESSING
     ========================= */
  // const rotateImage = (base64Image: string, degrees: number): Promise<string> => {
  //   return new Promise((resolve) => {
  //     const img = new Image()
  //     img.onload = () => {
  //       const canvas = document.createElement('canvas')
  //       const ctx = canvas.getContext('2d')

  //       if (!ctx) {
  //         resolve(base64Image)
  //         return
  //       }

  //       // Set canvas size based on rotation
  //       if (degrees === 90 || degrees === 270) {
  //         canvas.width = img.height
  //         canvas.height = img.width
  //       } else {
  //         canvas.width = img.width
  //         canvas.height = img.height
  //       }

  //       // Rotate and draw
  //       ctx.translate(canvas.width / 2, canvas.height / 2)
  //       ctx.rotate((degrees * Math.PI) / 180)
  //       ctx.drawImage(img, -img.width / 2, -img.height / 2)

  //       resolve(canvas.toDataURL('image/jpeg', 0.9))
  //     }
  //     img.src = base64Image
  //   })
  // }

  /* =========================
     ACTIONS
     ========================= */
  const handleCapture = async () => {
    if (!permissionGranted || !isActive) return

    try {
      setIsCapturing(true)

      if (isWebCamera) {
        // Capture from web camera
        await captureFromWebCamera()
      } else {
        // Capture from native camera
        const result = await CameraPreview.capture({
          quality: 90,
        })

        if (result?.value) {
          const base64Image = `data:image/jpeg;base64,${result.value}`
          onCapture(base64Image)
        }

        await stopCameraSafe()
      }
    } catch (err) {
      console.error('Capture error:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  const captureFromWebCamera = async () => {
    if (!videoRef.current) return

    try {
      const canvas = document.createElement('canvas')
      const video = videoRef.current

      // Swap width and height for 90-degree rotation
      canvas.width = video.videoHeight
      canvas.height = video.videoWidth

      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Rotate 90 degrees counter-clockwise (-90 degrees)
        ctx.translate(0, canvas.height)
        ctx.rotate(-Math.PI / 2)

        // Mirror the image horizontally to match the preview
        ctx.translate(video.videoWidth, 0)
        ctx.scale(-1, 1)

        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

        const base64Image = canvas.toDataURL('image/jpeg', 0.9)
        onCapture(base64Image)
      }

      stopWebCamera()
    } catch (err) {
      console.error('Capture from web camera error:', err)
    }
  }

  const handleFlipCamera = async () => {
    try {
      await CameraPreview.flip()
      // Toggle current camera state
      setCurrentCamera(prev => prev === 'front' ? 'rear' : 'front')
    } catch (err) {
      console.error('Flip error:', err)
    }
  }

  const handleSwitchCamera = async (position: CameraPosition) => {
    if (position === currentCamera) return
    await startCamera(position)
  }

  const handleSwitchWebCamera = async (deviceId: string) => {
    if (deviceId === currentDeviceId) return
    await startWebCamera(deviceId)
  }

  const handleRetryPermission = async () => {
    setPermissionDenied(false)
    setPermissionGranted(false)
    await initCamera()
  }

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
    // Actions
    handleCapture,
    handleFlipCamera,
    handleSwitchCamera,
    handleSwitchWebCamera,
    handleRetryPermission,
    handleClose,
  }
}
