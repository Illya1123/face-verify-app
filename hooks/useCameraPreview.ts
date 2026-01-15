import { useEffect, useRef, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import {
  CameraPreview,
  CameraPreviewOptions,
} from '@capacitor-community/camera-preview'
import * as faceapi from 'face-api.js'

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
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isWebCameraRef = useRef(false)
  const isCountingDownRef = useRef(false)
  const onCaptureRef = useRef(onCapture)
  const needsRotationRef = useRef(false)

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
  const [faceDetected, setFaceDetected] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isCountingDown, setIsCountingDown] = useState(false)

	const faceDetectedRef = useRef(false)

	useEffect(() => {
  faceDetectedRef.current = faceDetected
}, [faceDetected])


  // Update refs when state changes
  useEffect(() => {
    isWebCameraRef.current = isWebCamera
  }, [isWebCamera])

  useEffect(() => {
    isCountingDownRef.current = isCountingDown
  }, [isCountingDown])

  useEffect(() => {
    onCaptureRef.current = onCapture
  }, [onCapture])

  useEffect(() => {
    needsRotationRef.current = needsRotation
  }, [needsRotation])

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
      stopFaceDetection()
      stopCountdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =========================
     FACE DETECTION
     ========================= */
  const detectFaceInImage = useCallback(async (imageSrc: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = async () => {
        try {
          console.log('🔍 Analyzing image for face...', { width: img.width, height: img.height })

          // Try multiple detectors in order of accuracy
          let detection = null

          // Try 1: SSD MobileNet v1 (most accurate) - LOWERED THRESHOLD
          try {
            detection = await faceapi
              .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
              .withFaceLandmarks()
            if (detection) console.log('✅ Detected with SsdMobilenetv1, score:', detection.detection.score.toFixed(3))
          } catch (err) {
            console.log('⚠️ SsdMobilenetv1 failed:', err)
          }

          // Try 2: Tiny Face Detector (faster, less accurate) - LOWERED THRESHOLD
          if (!detection) {
            try {
              detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.2  // Lowered from 0.3
                }))
                .withFaceLandmarks()
              if (detection) console.log('✅ Detected with TinyFaceDetector, score:', detection.detection.score.toFixed(3))
            } catch (err) {
              console.log('⚠️ TinyFaceDetector failed:', err)
            }
          }

          if (detection) {
            const { box } = detection.detection
            console.log('👤 Face detected in image:', {
              box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
              score: detection.detection.score.toFixed(3),
              imageSize: { w: img.width, h: img.height }
            })

            // Check if face is reasonable size (LOWERED THRESHOLD)
            const faceArea = box.width * box.height
            const imageArea = img.width * img.height
            const faceRatio = faceArea / imageArea

            console.log(`📊 Face ratio: ${(faceRatio * 100).toFixed(1)}% of image`)

            if (faceRatio > 0.01) { // Lowered from 0.02 to 0.01 (1% instead of 2%)
              console.log('✅ Face size is good, TRIGGERING COUNTDOWN!')
              resolve(true)
            } else {
              console.log('⚠️ Face too small, ignoring')
              resolve(false)
            }
          } else {
            console.log('❌ No face detected in image')
            resolve(false)
          }
        } catch (err) {
          console.error('💥 Face detection error:', err)
          resolve(false)
        }
      }
      img.onerror = () => {
        console.error('❌ Image load error')
        resolve(false)
      }
      img.src = imageSrc
    })
  }, [])

  /* =========================
     COUNTDOWN & CAPTURE
     ========================= */
  const rotateImage = (src: string, degrees: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        if (degrees === -90 || degrees === 90) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((degrees * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      }
      img.src = src
    })
  }

  const captureFromWebCamera = useCallback(async () => {
    console.log('📸 captureFromWebCamera called')
    const video = videoRef.current
    if (!video || !video.srcObject) {
      console.error('❌ No video source available')
      throw new Error('No video source')
    }

    return new Promise<string>((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(video, 0, 0)
        const base64 = canvas.toDataURL('image/jpeg', 0.9)
        console.log('✅ Web camera capture successful')
        resolve(base64)
      } catch (err) {
        console.error('❌ Web camera capture error:', err)
        reject(err)
      }
    })
  }, [])

  const handleNativeCapture = useCallback(async () => {
    console.log('📸 handleNativeCapture called')
    try {
      const result = await CameraPreview.capture({ quality: 90 })
      let base64Image = `data:image/jpeg;base64,${result.value}`

      if (needsRotationRef.current) {
        console.log('🔄 Rotating image -90 degrees')
        base64Image = await rotateImage(base64Image, -90)
      }

      console.log('✅ Native camera capture successful')
      return base64Image
    } catch (err) {
      console.error('❌ Native camera capture error:', err)
      throw err
    }
  }, [])

  const stopCountdown = useCallback(() => {
  if (countdownIntervalRef.current) {
    clearTimeout(countdownIntervalRef.current)
    countdownIntervalRef.current = null
  }

  isCountingDownRef.current = false
  setIsCountingDown(false)
  setCountdown(null)
}, [])


  const startCountdown = useCallback(() => {
  if (isCountingDownRef.current) return

  console.log('🚀 startCountdown SAFE')

  isCountingDownRef.current = true
  setIsCountingDown(true)
  setCountdown(3)

  const run = (value: number) => {
    // === ĐẾM ===
    setCountdown(value)

    // === CHỤP NGAY KHI value === 0 ===
    if (value === 0) {
      console.log('📸 COUNTDOWN === 0 → CAPTURE')

      countdownIntervalRef.current = null

      setTimeout(async () => {
        try {
          const image = isWebCameraRef.current
            ? await captureFromWebCamera()
            : await handleNativeCapture()

          console.log('✅ IMAGE CAPTURED')
          onCaptureRef.current(image)
        } catch (e) {
          console.error('❌ Capture failed', e)
        } finally {
          // RESET STATE
          isCountingDownRef.current = false
          faceDetectedRef.current = false

          setIsCountingDown(false)
          setFaceDetected(false)
          setCountdown(null)
        }
      }, 200)

      return
    }

    // === TIẾP TỤC ĐẾM ===
    countdownIntervalRef.current = setTimeout(() => {
      run(value - 1)
    }, 1000)
  }

  run(3)
}, [captureFromWebCamera, handleNativeCapture])



  /* =========================
     FACE DETECTION
     ========================= */
  const startFaceDetection = useCallback(() => {
    console.log('🎥 Starting face detection...', { isWebCamera, isActive })

    if (isWebCamera) {
      // Web camera detection using video element
      if (!videoRef.current) {
        console.log('Cannot start face detection: no video element')
        return
      }

      detectionIntervalRef.current = setInterval(async () => {
        const video = videoRef.current
        if (!video || video.readyState !== 4) {
          console.log('⏸️ Video not ready:', { hasVideo: !!video, readyState: video?.readyState })
          return
        }

        // Skip detection if already counting down
        if (isCountingDownRef.current) {
          console.log('⏭️ Skipping detection - countdown in progress')
          return
        }

        try {
          // Detect face with landmarks - try multiple models
          let detection = null

          // Try SSD MobileNet first (more accurate) - LOWERED THRESHOLD
          try {
            detection = await faceapi
              .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
              .withFaceLandmarks()
            if (detection) console.log('✅ Web camera: Detected with SsdMobilenetv1, score:', detection.detection.score.toFixed(3))
          } catch (err) {
            console.log('⚠️ Web camera SsdMobilenetv1 failed, trying TinyFaceDetector...')
          }

          // Fallback to Tiny Face Detector - LOWERED THRESHOLD
          if (!detection) {
            detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 416,
                scoreThreshold: 0.2  // Lowered from 0.3
              }))
              .withFaceLandmarks()
            if (detection) console.log('✅ Web camera: Detected with TinyFaceDetector, score:', detection.detection.score.toFixed(3))
          }

          if (detection) {
            const { box } = detection.detection
            console.log('👤 Face detected:', {
              box: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
              score: detection.detection.score.toFixed(2)
            })

            // Check if face is within the frame bounds
            // Frame is min(80vw, 60vh) with 3:4 aspect ratio, centered
            const vw = window.innerWidth
            const vh = window.innerHeight
            const frameWidth = Math.min(vw * 0.8, vh * 0.6)
            const frameHeight = frameWidth * 4 / 3
            const frameX = (vw - frameWidth) / 2
            const frameY = (vh - frameHeight) / 2

            // Scale detection box to screen coordinates
            const scaleX = vw / video.videoWidth
            const scaleY = vh / video.videoHeight

            const faceX = box.x * scaleX
            const faceY = box.y * scaleY
            const faceWidth = box.width * scaleX
            const faceHeight = box.height * scaleY

            console.log('📏 Frame check:', {
              frame: { x: Math.round(frameX), y: Math.round(frameY), w: Math.round(frameWidth), h: Math.round(frameHeight) },
              face: { x: Math.round(faceX), y: Math.round(faceY), w: Math.round(faceWidth), h: Math.round(faceHeight) }
            })

            // Check if face is mostly within frame (with some tolerance)
            const tolerance = 0.2 // 20% tolerance
            const isInFrame =
              faceX > frameX - (faceWidth * tolerance) &&
              faceY > frameY - (faceHeight * tolerance) &&
              (faceX + faceWidth) < (frameX + frameWidth + faceWidth * tolerance) &&
              (faceY + faceHeight) < (frameY + frameHeight + faceHeight * tolerance)

            console.log(isInFrame ? '✅ Face IN frame' : '❌ Face OUT of frame')

            if (isInFrame) {
              if (!faceDetected && !isCountingDown) {
                console.log('🎯 TRIGGERING COUNTDOWN! Face in frame, faceDetected:', faceDetected, 'isCountingDown:', isCountingDown)
                setFaceDetected(true)
                startCountdown()
              } else {
                console.log('⏭️ Skipping countdown trigger:', { faceDetected, isCountingDown })
              }
            } else {
              // Only reset if not already counting down
              if (faceDetectedRef.current && !isCountingDownRef.current) {
  console.log('⚠️ Face lost → reset')
  faceDetectedRef.current = false
  setFaceDetected(false)
  stopCountdown()
}

            }
          } else {
            console.log('❌ No face detected')
            // Only reset if not already counting down
            if (faceDetected && !isCountingDown) {
              console.log('⚠️ No face detected, resetting countdown')
              setFaceDetected(false)
              stopCountdown()
              setCountdown(null)
            }
          }
        } catch (err) {
          console.error('💥 Face detection error:', err)
        }
      }, 500) // Check every 500ms
    } else {
      // Native camera detection using sample captures
      console.log('🎥 Starting native camera face detection')

      detectionIntervalRef.current = setInterval(async () => {
        if (!isActive || capturingRef.current) {
          console.log('⏸️ Camera not active or already capturing')
          return
        }

        // Skip detection if already counting down
        if (isCountingDownRef.current) {
          console.log('⏭️ Skipping native detection - countdown in progress')
          return
        }

        try {
          // Capture a sample frame from native camera using regular capture
          console.log('📷 Capturing sample frame for detection...')
          const result = await CameraPreview.capture({
            quality: 30, // Low quality for faster detection
            width: 640,
            height: 480
          })

          if (result?.value) {
            console.log('✅ Sample captured, analyzing...')
            let base64Image = `data:image/jpeg;base64,${result.value}`

            // Apply same rotation logic as main capture if needed
            if (needsRotation) {
              base64Image = await rotateImage(base64Image, -90)
            }

            const hasFace = await detectFaceInImage(base64Image)

            if (hasFace) {
  if (!faceDetectedRef.current && !isCountingDownRef.current) {
    console.log('🎯 Native face detected → countdown')
    faceDetectedRef.current = true
    setFaceDetected(true)
    startCountdown()
  }
} else {
  if (faceDetectedRef.current && !isCountingDownRef.current) {
    console.log('⚠️ Native face lost')
    faceDetectedRef.current = false
    setFaceDetected(false)
    stopCountdown()
  }
}

          } else {
            console.log('❌ No result from capture')
          }
        } catch (err) {
          console.error('💥 Native camera detection error:', err)
        }
      }, 1500) // Check every 1.5s (slower to avoid too many captures)
    }
  }, [isWebCamera, isActive, needsRotation, startCountdown, stopCountdown, detectFaceInImage])

  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }

  // Start face detection when camera becomes active
  useEffect(() => {
    if (isActive) {
      // Small delay to ensure camera is ready
      const timeout = setTimeout(() => {
        console.log('⏰ Starting face detection timer...', { isWebCamera, isActive })
        startFaceDetection()
      }, isWebCamera ? 1000 : 2000) // Longer delay for native camera

      return () => {
        clearTimeout(timeout)
        stopFaceDetection()
        stopCountdown()
      }
    }
  }, [isActive, isWebCamera, startFaceDetection, stopCountdown])

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

  /* =========================
     ACTIONS - Manual Capture
     ========================= */
  const handleCaptureInternal = async () => {
    console.log('🎬 Manual capture button pressed')
    if (!permissionGranted || !isActive) {
      console.log('❌ Cannot capture: permission or camera not active')
      return
    }

    if (capturingRef.current) {
      console.log('⚠️ Already capturing, skipping...')
      return
    }

    capturingRef.current = true
    setIsCapturing(true)

    try {
      console.log('📸 Starting manual capture...', { isWebCamera })

      const base64Image = isWebCamera
        ? await captureFromWebCamera()
        : await handleNativeCapture()

      console.log('✅ Manual capture successful')
      onCapture(base64Image)

      if (isWebCamera) {
        stopWebCamera()
      } else {
        await stopCameraSafe()
      }
    } catch (err) {
      console.error('❌ Manual capture error:', err)
    } finally {
      capturingRef.current = false
      setIsCapturing(false)
    }
  }

  // Wrapper for manual button capture
  const handleCapture = () => {
    handleCaptureInternal()
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
    faceDetected,
    countdown,
    // Actions
    handleCapture,
    handleFlipCamera,
    handleSwitchCamera,
    handleSwitchWebCamera,
    handleRetryPermission,
    handleClose,
  }
}
