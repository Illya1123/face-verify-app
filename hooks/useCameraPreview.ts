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

export const useCameraPreview = ({ onCapture, onClose }: UseCameraPreviewProps) => {
  const startedRef = useRef(false)

  const [isActive, setIsActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  /* =========================
     LIFECYCLE
     ========================= */
  useEffect(() => {
    initCamera()

    return () => {
      stopCameraSafe()
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
        console.warn('CameraPreview chỉ chạy trên Android / iOS')
        setPermissionDenied(true)
        return
      }

      const granted = await requestCameraPermission()

      if (!granted) {
        setPermissionDenied(true)
        return
      }

      setPermissionGranted(true)
      await startCamera()
    } catch (err) {
      console.error('Init camera error:', err)
      setPermissionDenied(true)
    } finally {
      setIsCheckingPermission(false)
    }
  }

  /* =========================
     CAMERA CONTROL
     ========================= */
  const startCamera = async () => {
    if (startedRef.current) return

    try {
      console.log('Starting camera...')
      const options: CameraPreviewOptions = {
        position: 'front',
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
      console.log('Camera started successfully')
    } catch (err) {
      console.error('Start camera error:', err)
      setPermissionDenied(true)
    }
  }

  const stopCameraSafe = async () => {
    try {
      if (startedRef.current) {
        await CameraPreview.stop()
        startedRef.current = false
        setIsActive(false)
      }
    } catch {
      // ignore
    }
  }

  /* =========================
     IMAGE PROCESSING
     ========================= */
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
    if (!permissionGranted || !isActive) return

    try {
      setIsCapturing(true)

      const result = await CameraPreview.capture({
        quality: 90,
      })

      if (result?.value) {
        const base64Image = `data:image/jpeg;base64,${result.value}`
        // Rotate image 270 degrees (or -90) to fix orientation
        const rotatedImage = await rotateImage(base64Image, 270)
        onCapture(rotatedImage)
      }

      await stopCameraSafe()
    } catch (err) {
      console.error('Capture error:', err)
    } finally {
      setIsCapturing(false)
    }
  }

  const handleFlipCamera = async () => {
    try {
      await CameraPreview.flip()
    } catch (err) {
      console.error('Flip error:', err)
    }
  }

  const handleRetryPermission = async () => {
    setPermissionDenied(false)
    setPermissionGranted(false)
    await initCamera()
  }

  const handleClose = async () => {
    await stopCameraSafe()
    onClose()
  }

  return {
    // State
    isActive,
    isCapturing,
    isCheckingPermission,
    permissionGranted,
    permissionDenied,
    // Actions
    handleCapture,
    handleFlipCamera,
    handleRetryPermission,
    handleClose,
  }
}
