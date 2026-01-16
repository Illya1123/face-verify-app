import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import { CameraPreview, CameraPreviewOptions } from '@capacitor-community/camera-preview'
import type { CameraPosition, CameraDevice } from './types'

export const useCameraControl = () => {
  const startedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isActive, setIsActive] = useState(false)
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
     PERMISSION
     ========================= */
  const requestCameraPermission = async (): Promise<boolean> => {
    const result = await Camera.requestPermissions({
      permissions: ['camera'],
    })
    return result.camera === 'granted'
  }

  /* =========================
     DETECT CAMERAS
     ========================= */
  const detectAvailableCameras = async () => {
    try {
      const cameras: CameraPosition[] = []
      cameras.push('front')

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
     NATIVE CAMERA CONTROL
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
     ACTIONS
     ========================= */
  const handleFlipCamera = async () => {
    try {
      await CameraPreview.flip()
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

  /* =========================
     INITIALIZATION
     ========================= */
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
     DEVICE DETECTION
     ========================= */
  useEffect(() => {
    const detectDeviceType = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isPhone = /mobile|android.*mobile|iphone|ipod/.test(userAgent) &&
                      !/tablet|ipad/.test(userAgent)

      const screenSize = Math.min(window.screen.width, window.screen.height)
      const isSmallScreen = screenSize < 768

      console.log('Device detection:', { userAgent, isPhone, screenSize, isSmallScreen })
      setNeedsRotation(isPhone && isSmallScreen)
    }

    detectDeviceType()
  }, [])

  return {
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
  }
}
