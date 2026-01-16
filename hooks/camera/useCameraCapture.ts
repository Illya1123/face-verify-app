import { useCallback, useRef, useState } from 'react'
import { CameraPreview } from '@capacitor-community/camera-preview'

export const useCameraCapture = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  needsRotationRef: React.RefObject<boolean>,
  isWebCameraRef: React.RefObject<boolean>
) => {
  const capturingRef = useRef(false)
  const [isCapturing, setIsCapturing] = useState(false)

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

  // Crop image to match the corner frame (3:4 aspect ratio)
  const cropToFrame = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }

        const imgWidth = img.width
        const imgHeight = img.height
        const targetAspectRatio = 3 / 4 // Width / Height
        const currentAspectRatio = imgWidth / imgHeight

        // console.log('🖼️ Crop to frame:', {
        //   original: { w: imgWidth, h: imgHeight, ratio: currentAspectRatio.toFixed(2) },
        //   target: { ratio: targetAspectRatio.toFixed(2) }
        // })

        let cropWidth: number
        let cropHeight: number
        let cropX: number
        let cropY: number

        if (currentAspectRatio > targetAspectRatio) {
          // Image is wider (landscape) - crop left and right (thiết bị lớn)
          cropHeight = imgHeight
          cropWidth = cropHeight * targetAspectRatio
          cropX = (imgWidth - cropWidth) / 2
          cropY = 0
        //   console.log('✂️ Cropping sides (landscape tablet/kiosk)')
        } else {
          // Image is taller (portrait) - crop top and bottom (màn hình nhỏ)
          cropWidth = imgWidth
          cropHeight = cropWidth / targetAspectRatio
          cropX = 0
          cropY = (imgHeight - cropHeight) / 2
        //   console.log('✂️ Cropping top/bottom (portrait phone)')
        }

        // console.log('📐 Crop area:', {
        //   x: Math.round(cropX),
        //   y: Math.round(cropY),
        //   w: Math.round(cropWidth),
        //   h: Math.round(cropHeight)
        // })

        canvas.width = cropWidth
        canvas.height = cropHeight

        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        )

        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => {
        console.error('Crop image load error')
        resolve(src)
      }
      img.src = src
    })
  }

  const captureFromWebCamera = useCallback(async () => {
    // console.log('📸 captureFromWebCamera called')
    const video = videoRef.current
    if (!video || !video.srcObject) {
      console.error('No video source available')
      throw new Error('No video source')
    }

    return new Promise<string>(async (resolve, reject) => {
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
        let base64 = canvas.toDataURL('image/jpeg', 0.9)
        // console.log('✅ Web camera capture successful')

        // Crop to frame
        base64 = await cropToFrame(base64)
        // console.log('✅ Cropped to frame')

        resolve(base64)
      } catch (err) {
        // console.error('❌ Web camera capture error:', err)
        reject(err)
      }
    })
  }, [videoRef])

  const handleNativeCapture = useCallback(async () => {
    console.log('handleNativeCapture called')
    try {
      const result = await CameraPreview.capture({ quality: 90 })
      let base64Image = `data:image/jpeg;base64,${result.value}`

      if (needsRotationRef.current) {
        console.log('Rotating image -90 degrees')
        base64Image = await rotateImage(base64Image, -90)
      }

      // Crop to frame
      console.log('Cropping to frame...')
      base64Image = await cropToFrame(base64Image)

      console.log('Native camera capture successful and cropped')
      return base64Image
    } catch (err) {
      console.error('Native camera capture error:', err)
      throw err
    }
  }, [needsRotationRef])

  const handleCaptureInternal = useCallback(async (
    onCapture: (base64Image: string) => void,
    stopWebCamera: () => void,
    stopCameraSafe: () => Promise<void>,
    permissionGranted: boolean,
    isActive: boolean
  ) => {
    console.log('Manual capture button pressed')
    if (!permissionGranted || !isActive) {
      console.log('Cannot capture: permission or camera not active')
      return
    }

    if (capturingRef.current) {
      console.log('Already capturing, skipping...')
      return
    }

    capturingRef.current = true
    setIsCapturing(true)

    try {
      console.log('Starting manual capture...', { isWebCamera: isWebCameraRef.current })

      const base64Image = isWebCameraRef.current
        ? await captureFromWebCamera()
        : await handleNativeCapture()

      console.log('Manual capture successful')
      onCapture(base64Image)

      if (isWebCameraRef.current) {
        stopWebCamera()
      } else {
        await stopCameraSafe()
      }
    } catch (err) {
      console.error('Manual capture error:', err)
    } finally {
      capturingRef.current = false
      setIsCapturing(false)
    }
  }, [captureFromWebCamera, handleNativeCapture, isWebCameraRef])

  return {
    isCapturing,
    capturingRef,
    captureFromWebCamera,
    handleNativeCapture,
    handleCaptureInternal,
  }
}
