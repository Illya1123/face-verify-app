'use client'

import { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'

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
    const webcamRef = useRef<Webcam>(null)
    const mobileCameraInputRef = useRef<HTMLInputElement>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [isCameraSupported, setIsCameraSupported] = useState(false)

    useEffect(() => {
        setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
        setIsCameraSupported(!!navigator.mediaDevices?.getUserMedia)
    }, [])

    const handleOpenCamera = () => {
        if (isMobile) {
            mobileCameraInputRef.current?.click()
        } else {
            setIsCameraOpen(true)
        }
    }

    const captureFromCamera = () => {
        const imageSrc = webcamRef.current?.getScreenshot()
        if (imageSrc) {
            onImageCapture(imageSrc)
            setIsCameraOpen(false)
        }
    }

    const videoConstraints = {
        facingMode: 'user',
        width: 1280,
        height: 720,
    }

    return (
        <div className="space-y-4">
            {/* Hidden input for mobile camera */}
            <input
                ref={mobileCameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={onMobileImageSelect}
                className="hidden"
            />

            {/* Open camera button */}
            <div>
                <button
                    onClick={handleOpenCamera}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105"
                >
                    📷 Mở Camera
                </button>
            </div>

            {/* Desktop webcam */}
            {!isMobile && isCameraOpen && isCameraSupported && (
                <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">
                            Camera Preview
                        </h4>
                        <button
                            onClick={() => setIsCameraOpen(false)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={videoConstraints}
                        mirrored
                        playsInline
                        className="w-full max-w-md h-96 border-2 border-gray-300 dark:border-gray-600 rounded-lg object-cover mx-auto"
                    />

                    <button
                        onClick={captureFromCamera}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                    >
                        📸 Chụp Ảnh
                    </button>
                </div>
            )}

            {!isCameraSupported && !isMobile && (
                <p className="text-red-600 dark:text-red-400 text-sm">
                    Camera không được hỗ trợ trên thiết bị này.
                </p>
            )}
        </div>
    )
}

export default CameraSection
