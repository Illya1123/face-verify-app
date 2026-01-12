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

                {/* ===== Header ===== */}
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                        Face Verification
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
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

                {/* ===== Main content ===== */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Step 1 */}
                    <div className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                            Bước 1: Ảnh tham chiếu
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Chọn một ảnh rõ mặt, nhìn thẳng, không che khuôn mặt
                        </p>
                        <ImageSelector onImageSelect={handleReferenceImageSelect} />
                        <ImagePreview capturedImage={referenceImage} />
                    </div>

                    {/* Step 2 */}
                    <div className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                            Bước 2: Ảnh xác minh
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Chụp ảnh trực tiếp từ camera để xác minh
                        </p>
                        <CameraSection
                            isCameraOpen={isCameraOpen}
                            setIsCameraOpen={setIsCameraOpen}
                            onImageCapture={handleCaptureImage}
                            onMobileImageSelect={handleMobileCapture}
                        />
                        <ImagePreview capturedImage={capturedImage} />
                    </div>
                </div>

                {/* ===== Action ===== */}
                <div className="mt-10 text-center">
                    <button
                        onClick={compareFaces}
                        disabled={!referenceImage || !capturedImage || !modelsLoaded || isComparing}
                        className="
                            inline-flex items-center justify-center
                            px-8 py-3
                            rounded-md
                            bg-blue-600 text-white
                            text-sm font-medium
                            hover:bg-blue-700
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors
                        "
                    >
                        {isComparing ? 'Đang so sánh…' : 'So sánh khuôn mặt'}
                    </button>
                </div>

                {/* ===== Result ===== */}
                {comparisonResult && (
    <div
        className={`mt-10 rounded-xl border p-6 ${
            comparisonResult.includes('Cùng một người')
                ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
                : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'
        }`}
    >
        {/* ===== Header ===== */}
        <div className="mb-4">
            <h3
                className={`text-base font-semibold ${
                    comparisonResult.includes('Cùng một người')
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                }`}
            >
                Kết quả xác minh khuôn mặt
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Kết quả được tính toán dựa trên vector đặc trưng khuôn mặt và khoảng cách Euclidean
            </p>
        </div>

        {/* ===== Result text ===== */}
        <div
            className={`rounded-lg px-4 py-3 text-sm whitespace-pre-line ${
                comparisonResult.includes('Cùng một người')
                    ? 'bg-green-100 text-green-900 dark:bg-green-800/40 dark:text-green-100'
                    : 'bg-red-100 text-red-900 dark:bg-red-800/40 dark:text-red-100'
            }`}
        >
            {comparisonResult}
        </div>

        {/* ===== Divider ===== */}
        {referenceWithLandmarks && capturedWithLandmarks && (
            <div className="my-6 h-px bg-gray-200 dark:bg-gray-700" />
        )}

        {/* ===== Landmarks section ===== */}
        {referenceWithLandmarks && capturedWithLandmarks && (
            <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Phân tích chi tiết khuôn mặt (68 landmarks)
                </h4>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Ảnh tham chiếu
                        </p>
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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

                    <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Ảnh xác minh
                        </p>
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
        )}
    </div>
)}


            </Section>
        </Page>
    )
}

export default Index
