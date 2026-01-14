'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Webcam from 'react-webcam'
import { Capacitor } from '@capacitor/core'

interface CameraSectionProps {
    isCameraOpen: boolean
    setIsCameraOpen: (open: boolean) => void
    onImageCapture: (imageSrc: string) => void
    onMobileImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const CameraSection = ({
    isCameraOpen,
    setIsCameraOpen,
    onImageCapture,
    onMobileImageSelect,
}: CameraSectionProps) => {
    const router = useRouter()
    const webcamRef = useRef<Webcam>(null)
    const mobileCameraInputRef = useRef<HTMLInputElement>(null)

    const [isMobile, setIsMobile] = useState(false)
    const [isCameraSupported, setIsCameraSupported] = useState(false)
    const [isCapacitor, setIsCapacitor] = useState(false)
    const [videoConstraints, setVideoConstraints] = useState<{
        facingMode: string
        aspectRatio: number
        height?: { ideal: number }
    }>({
        facingMode: 'user',
        aspectRatio: 3 / 4,
    })

    useEffect(() => {
        setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
        setIsCameraSupported(!!navigator.mediaDevices?.getUserMedia)
        setIsCapacitor(Capacitor.isNativePlatform())

        // Set video constraints based on screen size
        const updateVideoConstraints = () => {
            // Use 80vh for better fit
            const height = Math.floor(window.innerHeight * 0.8)

            setVideoConstraints({
                facingMode: 'user',
                aspectRatio: 3 / 4,
                height: { ideal: Math.min(height, 1920) },
            })
        }

        updateVideoConstraints()
        window.addEventListener('resize', updateVideoConstraints)

        return () => window.removeEventListener('resize', updateVideoConstraints)
    }, [])

    const handleOpenCamera = () => {
        // Nếu chạy trong Capacitor app, navigate sang trang camera
        if (isCapacitor) {
            router.push('/camera')
        } else if (isMobile) {
            // Trên mobile browser, dùng file input
            mobileCameraInputRef.current?.click()
        } else {
            // Trên desktop, dùng webcam
            setIsCameraOpen(true)
        }
    }

    const handleCapture = () => {
        const imageSrc = webcamRef.current?.getScreenshot()
        if (imageSrc) {
            onImageCapture(imageSrc)
            setIsCameraOpen(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* Hidden mobile camera input */}
            <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={onMobileImageSelect}
                className="hidden"
            />

            {/* Action button */}
            <div>
                <button
                    type="button"
                    onClick={handleOpenCamera}
                    className="
                        w-full
                        px-5 py-3
                        rounded-md
                        bg-blue-600
                        text-white
                        font-medium
                        hover:bg-blue-700
                        transition-colors
                        disabled:opacity-50
                    "
                >
                    Mở camera
                </button>
            </div>

            {/* Desktop camera preview */}
            {!isMobile && isCameraOpen && isCameraSupported && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">

                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Camera preview
                        </h4>
                        <button
                            type="button"
                            onClick={() => setIsCameraOpen(false)}
                            className="
                                text-sm
                                text-gray-600
                                hover:text-gray-900
                                dark:text-gray-400
                                dark:hover:text-gray-200
                            "
                        >
                            Đóng
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            mirrored
                            playsInline
                            className="
                                w-full
                                max-w-sm
                                aspect-[3/4]
                                rounded-md
                                border
                                border-gray-300
                                dark:border-gray-600
                                object-cover
                            "
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleCapture}
                        className="
                            w-full
                            px-5 py-3
                            rounded-md
                            bg-green-600
                            text-white
                            font-medium
                            hover:bg-green-700
                            transition-colors
                        "
                    >
                        Chụp ảnh
                    </button>
                </div>
            )}

            {!isCameraSupported && !isMobile && (
                <p className="text-sm text-red-600 dark:text-red-400">
                    Thiết bị không hỗ trợ truy cập camera.
                </p>
            )}
        </div>
    )
}

export default CameraSection
