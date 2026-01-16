import { useCallback, useRef, useState, useEffect } from 'react'
import { CameraPreview } from '@capacitor-community/camera-preview'
import * as faceapi from 'face-api.js'

export const useFaceDetection = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isWebCamera: boolean,
  isActive: boolean,
  needsRotation: boolean,
  captureFromWebCamera: () => Promise<string>,
  handleNativeCapture: () => Promise<string>,
  onCapture: (base64Image: string) => void,
  capturingRef: React.RefObject<boolean>
) => {
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isWebCameraRef = useRef(false)
  const onCaptureRef = useRef(onCapture)
  const needsRotationRef = useRef(false)
  const faceDetectedRef = useRef(false)
  const capturedOnceRef = useRef(false)

  const [faceDetected, setFaceDetected] = useState(false)

  // Update refs
  useEffect(() => {
    isWebCameraRef.current = isWebCamera
  }, [isWebCamera])

  useEffect(() => {
    onCaptureRef.current = onCapture
  }, [onCapture])

  useEffect(() => {
    needsRotationRef.current = needsRotation
  }, [needsRotation])

  useEffect(() => {
    faceDetectedRef.current = faceDetected
  }, [faceDetected])

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

  const detectFaceInImage = useCallback(async (imageSrc: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = async () => {
        try {
          console.log('🔍 Analyzing image for face...', { width: img.width, height: img.height })

          let detection = null

          try {
            detection = await faceapi
              .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
              .withFaceLandmarks()
            if (detection) console.log('✅ Detected with SsdMobilenetv1, score:', detection.detection.score.toFixed(3))
          } catch (err) {
            console.log('⚠️ SsdMobilenetv1 failed:', err)
          }

          if (!detection) {
            try {
              detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.2
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

            const faceArea = box.width * box.height
            const imageArea = img.width * img.height
            const faceRatio = faceArea / imageArea

            console.log(`📊 Face ratio: ${(faceRatio * 100).toFixed(1)}% of image`)

            if (faceRatio > 0.01) {
              console.log('✅ Face size is good, triggering capture!')
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

  const resetCapture = useCallback(() => {
    capturedOnceRef.current = false
    faceDetectedRef.current = false
    setFaceDetected(false)
  }, [])

  const captureImmediately = useCallback(async () => {
    if (capturedOnceRef.current) {
      console.log('⏭️ Already captured, skipping')
      return
    }

    console.log('🚀 Face detected → Capturing immediately')
    capturedOnceRef.current = true

    try {
      const image = isWebCameraRef.current
        ? await captureFromWebCamera()
        : await handleNativeCapture()

      console.log('✅ IMAGE CAPTURED')
      onCaptureRef.current(image)
    } catch (e) {
      console.error('❌ Capture failed', e)
      // Reset flag on error để có thể thử lại
      capturedOnceRef.current = false
    } finally {
      faceDetectedRef.current = false
      setFaceDetected(false)
    }
  }, [captureFromWebCamera, handleNativeCapture])

  const startFaceDetection = useCallback(() => {
    console.log('🎥 Starting face detection...', { isWebCamera, isActive })

    if (isWebCamera) {
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

        if (capturedOnceRef.current) {
          console.log('⏭️ Skipping detection - already captured')
          return
        }

        try {
          let detection = null

          try {
            detection = await faceapi
              .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
              .withFaceLandmarks()
            if (detection) console.log('✅ Web camera: Detected with SsdMobilenetv1, score:', detection.detection.score.toFixed(3))
          } catch (err) {
            console.log('⚠️ Web camera SsdMobilenetv1 failed, trying TinyFaceDetector...')
          }

          if (!detection) {
            detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 416,
                scoreThreshold: 0.2
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

            const vw = window.innerWidth
            const vh = window.innerHeight
            const frameWidth = Math.min(vw * 0.8, vh * 0.6)
            const frameHeight = frameWidth * 4 / 3
            const frameX = (vw - frameWidth) / 2
            const frameY = (vh - frameHeight) / 2

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

            const tolerance = 0.2
            const isInFrame =
              faceX > frameX - (faceWidth * tolerance) &&
              faceY > frameY - (faceHeight * tolerance) &&
              (faceX + faceWidth) < (frameX + frameWidth + faceWidth * tolerance) &&
              (faceY + faceHeight) < (frameY + frameHeight + faceHeight * tolerance)

            console.log(isInFrame ? '✅ Face IN frame' : '❌ Face OUT of frame')

            if (isInFrame) {
              if (!faceDetectedRef.current) {
                console.log('🎯 Face in frame → Capturing!')
                faceDetectedRef.current = true
                setFaceDetected(true)
                captureImmediately()
              }
            } else {
              if (faceDetectedRef.current && !capturedOnceRef.current) {
                console.log('⚠️ Face lost → reset')
                resetCapture()
              }
            }
          } else {
            console.log('❌ No face detected')
            if (faceDetectedRef.current && !capturedOnceRef.current) {
              console.log('⚠️ No face, resetting')
              resetCapture()
            }
          }
        } catch (err) {
          console.error('💥 Face detection error:', err)
        }
      }, 300)
    } else {
      console.log('🎥 Starting native camera face detection')

      detectionIntervalRef.current = setInterval(async () => {
        if (!isActive || capturingRef.current) {
          console.log('Camera not active or already capturing')
          return
        }

        try {
          console.log('Capturing sample frame for detection...')
          const result = await CameraPreview.capture({
            quality: 30,
            width: 640,
            height: 480
          })

          if (result?.value) {
            console.log('Sample captured, analyzing...')
            let base64Image = `data:image/jpeg;base64,${result.value}`

            if (needsRotation) {
              base64Image = await rotateImage(base64Image, -90)
            }

            const hasFace = await detectFaceInImage(base64Image)

            if (hasFace) {
              if (!faceDetectedRef.current) {
                console.log('Native face detected → Capturing!')
                faceDetectedRef.current = true
                setFaceDetected(true)
                captureImmediately()
              }
            } else {
              if (faceDetectedRef.current && !capturedOnceRef.current) {
                console.log('Native face lost')
                resetCapture()
              }
            }
          } else {
            console.log('No result from capture')
          }
        } catch (err) {
          console.error('Native camera detection error:', err)
        }
      }, 1500)
    }
  }, [isWebCamera, isActive, needsRotation, captureImmediately, resetCapture, detectFaceInImage, videoRef, capturingRef])

  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }, [])

  // Start face detection when camera becomes active
  useEffect(() => {
    if (isActive) {
      const timeout = setTimeout(() => {
        console.log('Starting face detection timer...', { isWebCamera, isActive })
        startFaceDetection()
      }, isWebCamera ? 1000 : 2000)

      return () => {
        clearTimeout(timeout)
        stopFaceDetection()
        resetCapture()
      }
    }
  }, [isActive, isWebCamera, startFaceDetection, stopFaceDetection, resetCapture])

  return {
    faceDetected,
    startFaceDetection,
    stopFaceDetection,
  }
}
