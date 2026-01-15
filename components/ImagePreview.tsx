import Image from 'next/image'

interface ImagePreviewProps {
    capturedImage: string | null
}

const ImagePreview = ({ capturedImage }: ImagePreviewProps) => {
    if (!capturedImage) return null

    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Ảnh đã chụp / chọn</h3>

            <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <Image
                    src={capturedImage}
                    alt="Preview"
                    width={800}
                    height={800}
                    unoptimized
                    className="w-full h-auto"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
            </div>
        </div>
    )
}

export default ImagePreview
