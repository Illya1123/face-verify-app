import * as faceapi from 'face-api.js'
import { RESIZE_WIDTH, RESIZE_HEIGHT } from '@/constants/faceVerification'

/**
 * Resize image to a standard size while maintaining aspect ratio
 */
export const resizeImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = document.createElement('img')
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = RESIZE_WIDTH
            canvas.height = RESIZE_HEIGHT

            const ctx = canvas.getContext('2d')
            if (ctx) {
                // Draw image with aspect ratio maintained
                const scale = Math.max(RESIZE_WIDTH / img.width, RESIZE_HEIGHT / img.height)
                const x = RESIZE_WIDTH / 2 - (img.width / 2) * scale
                const y = RESIZE_HEIGHT / 2 - (img.height / 2) * scale
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
            }

            resolve(canvas.toDataURL('image/jpeg', 0.9))
        }
        img.src = imageSrc
    })
}

export const drawLandmarksOnImage = async (
    imageSrc: string,
    detection: faceapi.WithFaceLandmarks<
        { detection: faceapi.FaceDetection },
        faceapi.FaceLandmarks68
    >
): Promise<string> => {
    return new Promise((resolve) => {
        const img = document.createElement('img')
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(img, 0, 0)

                const box = detection.detection.box
                ctx.strokeStyle = '#00ff00'
                ctx.lineWidth = 3
                ctx.strokeRect(box.x, box.y, box.width, box.height)

                const landmarks = detection.landmarks.positions
                ctx.fillStyle = '#ff0000'
                landmarks.forEach((point) => {
                    ctx.beginPath()
                    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
                    ctx.fill()
                })

                ctx.fillStyle = '#00ff00'
                ctx.font = 'bold 16px Arial'
                ctx.fillText(`${(detection.detection.score * 100).toFixed(1)}%`, box.x, box.y - 5)
            }

            resolve(canvas.toDataURL('image/jpeg', 0.95))
        }
        img.src = imageSrc
    })
}

export const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
