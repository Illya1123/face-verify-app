'use client'

import { useState, useEffect } from 'react'
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

    useEffect(() => {
        const capturedImageFromStorage = localStorage.getItem('capturedImage')
        if (capturedImageFromStorage) {
            handleCaptureImage(capturedImageFromStorage)
            localStorage.removeItem('capturedImage')
        }
    }, [])

    const handleReferenceImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        const dataUrl = await readFileAsDataURL(file)
        const resized = await resizeImage(dataUrl)
        setReferenceImage(resized)
        setComparisonResult(null)
    }

    const handleCaptureImage = async (imageSrc: string) => {
        const resized = await resizeImage(imageSrc)
        setCapturedImage(resized)
        setComparisonResult(null)
    }

    const handleMobileCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        const dataUrl = await readFileAsDataURL(file)
        const resized = await resizeImage(dataUrl)
        setCapturedImage(resized)
        setComparisonResult(null)
    }

    const compareFaces = async () => {
        if (!referenceImage || !capturedImage || !modelsLoaded) return

        setIsComparing(true)
        setComparisonResult(null)
        setReferenceWithLandmarks(null)
        setCapturedWithLandmarks(null)

        const result = await compareFaceImages(referenceImage, capturedImage)
        setComparisonResult(result.message)

        if (result.success && result.refDetection && result.capDetection) {
            setReferenceWithLandmarks(
                await drawLandmarksOnImage(referenceImage, result.refDetection)
            )
            setCapturedWithLandmarks(
                await drawLandmarksOnImage(capturedImage, result.capDetection)
            )
        }

        setIsComparing(false)
    }

    return (
        <Page>
            <Section>
                <div className="text-center mb-4">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                        Face Verification
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                        So sánh ảnh tham chiếu và ảnh chụp trực tiếp để xác minh danh tính
                    </p>
                </div>

                {/* ===== Loading ===== */}
                {!modelsLoaded && modelsLoading && (
                    <div className="flex justify-center py-10">
                        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full" />
                            <span>Đang tải mô hình nhận diện khuôn mặt</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col flex-1 gap-3">

                    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Ảnh tham chiếu
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Upload ảnh khuôn mặt cần xác minh
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <ImageSelector onImageSelect={handleReferenceImageSelect} />
                            {referenceImage && (
                                <div className="mt-4">
                                    <ImagePreview capturedImage={referenceImage} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Camera/Verification Card */}
                    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Ảnh xác minh
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Chụp ảnh trực tiếp từ camera
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                            <CameraSection
                                isCameraOpen={isCameraOpen}
                                setIsCameraOpen={setIsCameraOpen}
                                onImageCapture={handleCaptureImage}
                                onMobileImageSelect={handleMobileCapture}
                            />
                            {capturedImage && (
                                <div className="mt-4">
                                    <ImagePreview capturedImage={capturedImage}/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compare Button - Mobile */}
                    <button
                        onClick={compareFaces}
                        disabled={!referenceImage || !capturedImage || !modelsLoaded || isComparing}
                        className="
                            w-full
                            rounded-2xl
                            bg-gradient-to-r from-blue-600 to-indigo-600
                            text-white
                            text-base font-semibold
                            shadow-lg shadow-blue-500/50
                            hover:shadow-xl hover:shadow-blue-500/50
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                            transition-all
                            flex items-center justify-center gap-2
                            py-4 min-h-[56px]
                        ">
                        {isComparing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang so sánh...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                So sánh khuôn mặt
                            </>
                        )}
                    </button>
                </div>



                {/* ===== Result ===== */}
                {comparisonResult && (
                    <div className={`rounded-2xl border p-4 mt-4 ${
                        comparisonResult.includes('Cùng một người')
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
                            : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'
                    }`}>
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    comparisonResult.includes('Cùng một người')
                                        ? 'bg-green-100 dark:bg-green-800'
                                        : 'bg-red-100 dark:bg-red-800'
                                }`}>
                                    {comparisonResult.includes('Cùng một người') ? (
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </div>
                                <h3 className={`text-base font-semibold ${
                                    comparisonResult.includes('Cùng một người')
                                        ? 'text-green-800 dark:text-green-200'
                                        : 'text-red-800 dark:text-red-200'
                                }`}>
                                    Kết quả xác minh
                                </h3>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 ml-10">
                                Kết quả được tính toán dựa trên vector đặc trưng khuôn mặt
                            </p>
                        </div>

                        {/* ===== Result text ===== */}
                        <div className={`rounded-xl px-4 py-3 text-sm whitespace-pre-line ${
                            comparisonResult.includes('Cùng một người')
                                ? 'bg-green-100 text-green-900 dark:bg-green-800/40 dark:text-green-100'
                                : 'bg-red-100 text-red-900 dark:bg-red-800/40 dark:text-red-100'
                        }`}>
                            {comparisonResult}
                        </div>

                        {/* ===== Landmarks section ===== */}
                        {referenceWithLandmarks && capturedWithLandmarks && (
                            <>
                                <div className="my-5 h-px bg-gray-200 dark:bg-gray-700" />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            Phân tích chi tiết (68 landmarks)
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                Ảnh tham chiếu
                                            </p>
                                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                <Image
                                                    src={referenceWithLandmarks}
                                                    alt="Reference landmarks"
                                                    width={640}
                                                    height={640}
                                                    className="w-full"
                                                    unoptimized
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                Ảnh xác minh
                                            </p>
                                            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                                <Image
                                                    src={capturedWithLandmarks}
                                                    alt="Captured landmarks"
                                                    width={640}
                                                    height={640}
                                                    className="w-full"
                                                    unoptimized
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        Các điểm landmark được dùng để căn chỉnh khuôn mặt trước khi trích xuất vector đặc trưng.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}


            </Section>
        </Page>
    )
}

export default Index
