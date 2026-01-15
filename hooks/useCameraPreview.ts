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
  const capturingRef = useRef(false)

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
  const [needsRotation, setNeedsRotation] = useState(false)

  /* =========================
     LIFECYCLE
     ========================= */
  useEffect(() => {
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isPhone = /mobile|android.*mobile|iphone|ipod/.test(userAgent) &&
                      !/tablet|ipad/.test(userAgent)

      const screenSize = Math.min(window.screen.width, window.screen.height)
      const isSmallScreen = screenSize < 768 // Less than tablet size

      console.log('Device detection:', { userAgent, isPhone, screenSize, isSmallScreen })
      setNeedsRotation(isPhone && isSmallScreen)
    }

    detectDeviceType()
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      const cameras: CameraDevice[] = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))

      const sortedCameras = cameras.sort((a, b) => {
        const builtInKeywords = ['integrated', 'facetime', 'front', 'rear', 'webcam', 'built-in']
        const aIsBuiltIn = builtInKeywords.some(keyword =>
          a.label.toLowerCase().includes(keyword)
        )
        const bIsBuiltIn = builtInKeywords.some(keyword =>
          b.label.toLowerCase().includes(keyword)
        )

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
  const cropLandscapeToPortrait = (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(base64Image)
          return
        }
        const targetAspectRatio = 3 / 4

        const cropHeight = img.height
        const cropWidth = cropHeight * targetAspectRatio

        const cropX = (img.width - cropWidth) / 2
        const cropY = 0

        console.log('Landscape to portrait crop:', {
          original: { w: img.width, h: img.height },
          crop: { x: cropX, y: cropY, w: cropWidth, h: cropHeight }
        })

        canvas.width = cropWidth
        canvas.height = cropHeight

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        )

        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.src = base64Image
    })
  }

  const cropToFaceFrame = (base64Image: string, isRotated: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(base64Image)
          return
        }

        const vw = window.innerWidth
        const vh = window.innerHeight
        const frameWidth = Math.min(vw * 0.8, vh * 0.6)
        const frameHeight = frameWidth * 4 / 3

        const scaleX = isRotated ? (img.width / vh) : (img.width / vw)
        const scaleY = isRotated ? (img.height / vw) : (img.height / vh)

        const frameCenterX = isRotated ? (vh / 2) : (vw / 2)
        const frameCenterY = isRotated ? (vw / 2) : (vh / 2)

        const cropWidth = frameWidth * scaleX
        const cropHeight = frameHeight * scaleY
        const cropX = (frameCenterX - frameWidth / 2) * scaleX
        const cropY = (frameCenterY - frameHeight / 2) * scaleY

        console.log('Crop params:', {
          imgSize: { w: img.width, h: img.height },
          frameSize: { w: frameWidth, h: frameHeight },
          cropArea: { x: cropX, y: cropY, w: cropWidth, h: cropHeight },
          isRotated
        })

        // Set canvas to cropped size
        canvas.width = cropWidth
        canvas.height = cropHeight

        // Draw cropped image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        )

        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.src = base64Image
    })
  }

  const rotateImage = (base64Image: string, degrees: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(base64Image)
          return
        }

        // Set canvas size based on rotation
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }

        // Rotate and draw
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((degrees * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)

        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.src = base64Image
    })
  }

  /* =========================
     ACTIONS
     ========================= */
  const handleCapture = async () => {
    if (!permissionGranted || !isActive || capturingRef.current) return

    capturingRef.current = true
    setIsCapturing(true)

    try {

      if (isWebCamera) {
        // Capture from web camera
        await captureFromWebCamera()
      } else {
        // Capture from native camera
        const result = await CameraPreview.capture({
          quality: 90,
        })

        if (result?.value) {
          let base64Image = `data:image/jpeg;base64,${result.value}`

          // Only rotate on phones, crop center for tablets/kiosk
          if (needsRotation) {
            console.log('Rotating image -90 degrees (phone detected)')
            base64Image = await rotateImage(base64Image, -90)
          } else {
            console.log('Processing image for tablet/kiosk')

            // Check if image is landscape (width > height)
            const img = await new Promise<HTMLImageElement>((resolve) => {
              const image = new Image()
              image.onload = () => resolve(image)
              image.src = base64Image
            })

            const isLandscape = img.width > img.height
            console.log('Image dimensions:', { w: img.width, h: img.height, isLandscape })

            if (isLandscape) {
              // Crop center portion to convert landscape to portrait
              console.log('Cropping center of landscape image to portrait')
              base64Image = await cropLandscapeToPortrait(base64Image)
            }

            // Then crop to face frame
            console.log('Cropping to face frame')
            base64Image = await cropToFaceFrame(base64Image, false)
          }

          onCapture(base64Image)
        }

        await stopCameraSafe()
      }
    } catch (err) {
      console.error('Capture error:', err)
    } finally {
      capturingRef.current = false
      setIsCapturing(false)
    }
  }

  const captureFromWebCamera = async () => {
    if (!videoRef.current) return

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')

      // Keep original aspect ratio (3:4 portrait)
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw directly without mirroring to get correct orientation
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const base64Image = canvas.toDataURL('image/jpeg', 0.9)
      onCapture(base64Image)

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
