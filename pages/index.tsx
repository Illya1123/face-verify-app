'use client'

import { useState } from 'react'
import Image from 'next/image'
import Page from '@/components/page'
import Section from '@/components/section'
import ImageSelector from '@/components/ImageSelector'
import CameraSection from '@/components/CameraSection'
import ImagePreview from '@/components/ImagePreview'
import { useFaceModels } from '@/hooks/useFaceModels'
import { resizeImage, drawLandmarksOnImage, readFileAsDataURL } from '@/utils/imageProcessing'
import { compareFaceImages } from '@/services/faceComparison'

const Index = () => {
    const [referenceImage, setReferenceImage] = useState<string | null>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [comparisonResult, setComparisonResult] = useState<string | null>(null)
    const [isComparing, setIsComparing] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [referenceWithLandmarks, setReferenceWithLandmarks] = useState<string | null>(null)
    const [capturedWithLandmarks, setCapturedWithLandmarks] = useState<string | null>(null)

    const { modelsLoaded, modelsLoading } = useFaceModels()

    /* ===== Upload ảnh tham chiếu ===== */
    const handleReferenceImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const dataUrl = await readFileAsDataURL(file)
        const resized = await resizeImage(dataUrl)
        setReferenceImage(resized)
        setComparisonResult(null)
    }

    /* ===== Nhận ảnh chụp từ camera ===== */
    const handleCaptureImage = async (imageSrc: string) => {
        const resized = await resizeImage(imageSrc)
        setCapturedImage(resized)
        setComparisonResult(null)
    }

    /* ===== Mobile camera capture ===== */
    const handleMobileCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const dataUrl = await readFileAsDataURL(file)
        const resized = await resizeImage(dataUrl)
        setCapturedImage(resized)
        setComparisonResult(null)
    }

    /* ===== Core so sánh khuôn mặt ===== */
    const compareFaces = async () => {
        if (!referenceImage || !capturedImage || !modelsLoaded) return

        setIsComparing(true)
        setComparisonResult(null)
        setReferenceWithLandmarks(null)
        setCapturedWithLandmarks(null)

        const result = await compareFaceImages(referenceImage, capturedImage)

        setComparisonResult(result.message)

        // Draw landmarks if comparison was successful
        if (result.success && result.refDetection && result.capDetection) {
            const refWithLandmarks = await drawLandmarksOnImage(referenceImage, result.refDetection)
            const capWithLandmarks = await drawLandmarksOnImage(capturedImage, result.capDetection)

            setReferenceWithLandmarks(refWithLandmarks)
            setCapturedWithLandmarks(capWithLandmarks)
        }

        setIsComparing(false)
    }

    return (
        <Page>
            <Section>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Face Verification App
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Xác minh khuôn mặt bằng công nghệ AI
                    </p>
                </div>

                {!modelsLoaded && modelsLoading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <span className="ml-4 text-yellow-600 dark:text-yellow-400">
                            Đang tải các mô hình AI nâng cao...
                        </span>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                    {/* ===== 1. Ảnh tham chiếu (UPLOAD) ===== */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center mb-4">
                            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mr-3">
                                <span className="text-blue-600 dark:text-blue-400 text-xl">📤</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Ảnh tham chiếu
                            </h3>
                        </div>
                        <ImageSelector onImageSelect={handleReferenceImageSelect} />
                        <ImagePreview capturedImage={referenceImage} />
                    </div>

                    {/* ===== 2. Ảnh chụp từ CAMERA ===== */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center mb-4">
                            <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 mr-3">
                                <span className="text-green-600 dark:text-green-400 text-xl">
                                    📷
                                </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Ảnh xác minh
                            </h3>
                        </div>
                        <CameraSection
                            isCameraOpen={isCameraOpen}
                            setIsCameraOpen={setIsCameraOpen}
                            onImageCapture={handleCaptureImage}
                            onMobileImageSelect={handleMobileCapture}
                        />
                        <ImagePreview capturedImage={capturedImage} />
                    </div>
                </div>

                {/* ===== 3. Nút so sánh ===== */}
                <div className="mt-8 text-center">
                    <button
                        onClick={compareFaces}
                        disabled={!referenceImage || !capturedImage || !modelsLoaded || isComparing}
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                    >
                        {isComparing ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Đang so sánh...
                            </div>
                        ) : (
                            'So sánh khuôn mặt'
                        )}
                    </button>
                </div>

                {/* ===== 4. Kết quả ===== */}
                {comparisonResult && (
                    <div
                        className={`mt-8 p-6 rounded-lg shadow-lg border ${
                            comparisonResult.includes('Cùng một người')
                                ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
                        }`}
                    >
                        <div className="flex items-center mb-4">
                            <span
                                className={`text-2xl mr-3 ${
                                    comparisonResult.includes('Cùng một người')
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                                {comparisonResult.includes('Cùng một người') ? '✅' : '❌'}
                            </span>
                            <p
                                className={`text-lg font-medium whitespace-pre-line ${
                                    comparisonResult.includes('Cùng một người')
                                        ? 'text-green-800 dark:text-green-200'
                                        : 'text-red-800 dark:text-red-200'
                                }`}
                            >
                                {comparisonResult}
                            </p>
                        </div>

                        {/* Hiển thị ảnh có landmarks */}
                        {referenceWithLandmarks && capturedWithLandmarks && (
                            <div className="mt-6">
                                <h4 className="text-md font-semibold mb-3 text-gray-700 dark:text-gray-300">
                                    Phân tích khuôn mặt với 68 landmarks:
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                                            Ảnh tham chiếu
                                        </p>
                                        <Image
                                            src={referenceWithLandmarks}
                                            alt="Reference with landmarks"
                                            width={640}
                                            height={640}
                                            className="w-full rounded border-2 border-blue-300 dark:border-blue-700"
                                            unoptimized
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                                            Ảnh xác minh
                                        </p>
                                        <Image
                                            src={capturedWithLandmarks}
                                            alt="Captured with landmarks"
                                            width={640}
                                            height={640}
                                            className="w-full rounded border-2 border-green-300 dark:border-green-700"
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Section>
        </Page>
    )
}

export default Index
