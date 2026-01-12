import { forwardRef } from 'react'

interface ImageSelectorProps {
    onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const ImageSelector = forwardRef<HTMLInputElement, ImageSelectorProps>(({ onImageSelect }, ref) => (
    <div>
        <label
            htmlFor="image-select"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
        >
            Chọn ảnh từ thiết bị
        </label>

        <input
            id="image-select"
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            className="block w-full text-sm text-zinc-500
                    file:mr-4 file:py-2 file:px-4 file:rounded-full
                    file:border-0 file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
    </div>
))

ImageSelector.displayName = 'ImageSelector'

export default ImageSelector
