import * as faceapi from 'face-api.js'
import {
    FACE_DISTANCE_THRESHOLD,
    FACE_CONFIDENCE_THRESHOLD,
    MIN_FACE_SIZE,
} from '@/constants/faceVerification'

export interface FaceComparisonResult {
    success: boolean
    isMatch: boolean
    message: string
    distance?: number
    refFaceSize?: number
    capFaceSize?: number
    landmarksCount?: number
    refDetection?: faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
    >
    capDetection?: faceapi.WithFaceDescriptor<
        faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>
    >
}

/**
 * Compare two face images and return detailed results
 */
export const compareFaceImages = async (
    referenceImage: string,
    capturedImage: string
): Promise<FaceComparisonResult> => {
    try {
        const refImg = await faceapi.fetchImage(referenceImage)
        const capImg = await faceapi.fetchImage(capturedImage)

        // Configure MTCNN for accurate detection
        const mtcnnOptions = new faceapi.MtcnnOptions({
            minFaceSize: MIN_FACE_SIZE,
            scaleFactor: 0.709,
            scoreThresholds: [0.6, 0.7, 0.7],
            maxNumScales: 10,
        })

        // Detect faces with MTCNN
        const refDetections = await faceapi
            .detectAllFaces(refImg, mtcnnOptions)
            .withFaceLandmarks()
            .withFaceDescriptors()

        const capDetections = await faceapi
            .detectAllFaces(capImg, mtcnnOptions)
            .withFaceLandmarks()
            .withFaceDescriptors()

        // Validation: Check for face presence
        if (refDetections.length === 0) {
            return {
                success: false,
                isMatch: false,
                message: 'Không phát hiện được khuôn mặt trong ảnh tham chiếu',
            }
        }
        if (capDetections.length === 0) {
            return {
                success: false,
                isMatch: false,
                message: 'Không phát hiện được khuôn mặt trong ảnh xác minh',
            }
        }

        // Validation: Check for multiple faces
        if (refDetections.length > 1) {
            return {
                success: false,
                isMatch: false,
                message:
                    'Ảnh tham chiếu có nhiều hơn một khuôn mặt. Vui lòng chọn ảnh có một khuôn mặt rõ ràng.',
            }
        }
        if (capDetections.length > 1) {
            return {
                success: false,
                isMatch: false,
                message:
                    'Ảnh xác minh có nhiều hơn một khuôn mặt. Vui lòng chọn ảnh có một khuôn mặt rõ ràng.',
            }
        }

        const refDetection = refDetections[0]
        const capDetection = capDetections[0]

        // Validation: Check confidence score
        if (refDetection.detection.score < FACE_CONFIDENCE_THRESHOLD) {
            return {
                success: false,
                isMatch: false,
                message: `Ảnh tham chiếu không rõ ràng (confidence: ${(
                    refDetection.detection.score * 100
                ).toFixed(1)}%). Vui lòng chọn ảnh rõ nét hơn.`,
            }
        }
        if (capDetection.detection.score < FACE_CONFIDENCE_THRESHOLD) {
            return {
                success: false,
                isMatch: false,
                message: `Ảnh xác minh không rõ ràng (confidence: ${(
                    capDetection.detection.score * 100
                ).toFixed(1)}%). Vui lòng chọn ảnh rõ nét hơn.`,
            }
        }

        // Validation: Check face size
        const refBox = refDetection.detection.box
        const capBox = capDetection.detection.box
        const refFaceSize = Math.min(refBox.width, refBox.height)
        const capFaceSize = Math.min(capBox.width, capBox.height)

        if (refFaceSize < MIN_FACE_SIZE) {
            return {
                success: false,
                isMatch: false,
                message: `Khuôn mặt trong ảnh tham chiếu quá nhỏ (${refFaceSize.toFixed(
                    0
                )}px). Vui lòng chọn ảnh gần hơn.`,
            }
        }
        if (capFaceSize < MIN_FACE_SIZE) {
            return {
                success: false,
                isMatch: false,
                message: `Khuôn mặt trong ảnh xác minh quá nhỏ (${capFaceSize.toFixed(
                    0
                )}px). Vui lòng chọn ảnh gần hơn.`,
            }
        }

        // Calculate Euclidean distance between face descriptors
        const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor)

        const isMatch = distance < FACE_DISTANCE_THRESHOLD

        let message = isMatch
            ? `Cùng một người (Độ tương đồng: ${((1 - distance) * 100).toFixed(1)}%)`
            : `Khác người (Độ tương đồng: ${((1 - distance) * 100).toFixed(1)}%)`

        message += `\nDistance: ${distance.toFixed(3)} (ngưỡng: ${FACE_DISTANCE_THRESHOLD})`
        message += `\nKích thước khuôn mặt: ${refFaceSize.toFixed(0)}px / ${capFaceSize.toFixed(
            0
        )}px`
        message += `\nSố landmarks: ${refDetection.landmarks.positions.length} điểm`

        return {
            success: true,
            isMatch,
            message,
            distance,
            refFaceSize,
            capFaceSize,
            landmarksCount: refDetection.landmarks.positions.length,
            refDetection,
            capDetection,
        }
    } catch (error) {
        console.error('Face comparison error:', error)
        return {
            success: false,
            isMatch: false,
            message: 'Lỗi khi so sánh khuôn mặt. Vui lòng thử lại với ảnh chất lượng cao hơn.',
        }
    }
}
