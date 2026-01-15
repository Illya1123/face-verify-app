import * as faceapi from 'face-api.js'

const MAX_IMAGE_SIZE = 1920

export const resizeImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = document.createElement('img')
        img.onload = () => {
            let width = img.width
            let height = img.height

            if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
                const scale = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height)
                width = Math.floor(width * scale)
                height = Math.floor(height * scale)
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height)
            }

            resolve(canvas.toDataURL('image/jpeg', 0.92))
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
        reader.onload = async () => {
            const dataUrl = reader.result as string
            // Fix EXIF orientation
            const correctedDataUrl = await fixImageOrientation(dataUrl, file)
            resolve(correctedDataUrl)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

const fixImageOrientation = (dataUrl: string, file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const view = new DataView(e.target?.result as ArrayBuffer)
            let orientation = 1

            if (view.getUint16(0, false) !== 0xFFD8) {
                resolve(dataUrl)
                return
            }

            const length = view.byteLength
            let offset = 2

            while (offset < length) {
                if (view.getUint16(offset + 2, false) <= 8) break
                const marker = view.getUint16(offset, false)
                offset += 2

                if (marker === 0xFFE1) {
                    // EXIF marker
                    const littleEndian = view.getUint16(offset + 8, false) === 0x4949
                    offset += 10

                    // Read orientation tag
                    const tags = view.getUint16(offset, littleEndian)
                    offset += 2

                    for (let i = 0; i < tags; i++) {
                        const tag = view.getUint16(offset + i * 12, littleEndian)
                        if (tag === 0x0112) {
                            // Orientation tag
                            orientation = view.getUint16(offset + i * 12 + 8, littleEndian)
                            break
                        }
                    }
                    break
                } else {
                    offset += view.getUint16(offset, false)
                }
            }

            // Apply orientation correction
            if (orientation === 1) {
                resolve(dataUrl)
                return
            }

            const img = document.createElement('img')
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(dataUrl)
                    return
                }

                let width = img.width
                let height = img.height

                // Set canvas size based on orientation
                if (orientation >= 5 && orientation <= 8) {
                    canvas.width = height
                    canvas.height = width
                } else {
                    canvas.width = width
                    canvas.height = height
                }

                // Apply transformations
                switch (orientation) {
                    case 2:
                        ctx.transform(-1, 0, 0, 1, width, 0)
                        break
                    case 3:
                        ctx.transform(-1, 0, 0, -1, width, height)
                        break
                    case 4:
                        ctx.transform(1, 0, 0, -1, 0, height)
                        break
                    case 5:
                        ctx.transform(0, 1, 1, 0, 0, 0)
                        break
                    case 6:
                        ctx.transform(0, 1, -1, 0, height, 0)
                        break
                    case 7:
                        ctx.transform(0, -1, -1, 0, height, width)
                        break
                    case 8:
                        ctx.transform(0, -1, 1, 0, 0, width)
                        break
                }

                ctx.drawImage(img, 0, 0)
                resolve(canvas.toDataURL('image/jpeg', 0.92))
            }
            img.src = dataUrl
        }

        reader.readAsArrayBuffer(file)
    })
}
