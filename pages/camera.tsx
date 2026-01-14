'use client'

import { useRouter } from 'next/router'
import { useEffect } from 'react'
import CapacitorCameraPreview from '@/components/CapacitorCameraPreview'
import { Capacitor } from '@capacitor/core'

const CameraPage = () => {
  const router = useRouter()

  useEffect(() => {
    // Nếu không phải native platform, redirect về trang chủ
    if (!Capacitor.isNativePlatform()) {
      router.push('/')
    }
  }, [router])

  const handleCapture = (base64Image: string) => {
    // Lưu ảnh vào localStorage
    localStorage.setItem('capturedImage', base64Image)
    // Navigate back về trang chủ
    router.push('/')
  }

  const handleClose = () => {
    // Navigate back về trang chủ
    router.push('/')
  }

  return (
    <CapacitorCameraPreview
      onCapture={handleCapture}
      onClose={handleClose}
    />
  )
}

export default CameraPage
