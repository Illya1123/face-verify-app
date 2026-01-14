import Image from 'next/image'

interface ImagePreviewProps {
    capturedImage: string | null
    rotate?: boolean
}

const ImagePreview = ({ capturedImage, rotate = false }: ImagePreviewProps) => {
    if (!capturedImage) return null

    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Ảnh đã chụp / chọn</h3>

            <Image
                src={capturedImage}
                alt="Preview"
                width={400}
                height={400}
                unoptimized
                style={rotate ? { transform: 'rotate(-90deg)' } : undefined}
                className={rotate ? 'mx-auto' : ''}
            />
        </div>
    )
}

export default ImagePreview
