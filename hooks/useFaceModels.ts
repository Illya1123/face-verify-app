import { useQuery } from '@tanstack/react-query'
import * as faceapi from 'face-api.js'
import { getFaceApiModelUrl } from '@/utils/faceApiPath'

export const useFaceModels = () => {
    const { data: modelsLoaded = false, isLoading: modelsLoading } = useQuery({
        queryKey: ['faceModels'],
        queryFn: async () => {
            const MODEL_URL = getFaceApiModelUrl()

            await Promise.all([
                faceapi.nets.mtcnn.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ])

            return true
        },
        staleTime: Infinity,
    })

    return { modelsLoaded, modelsLoading }
}
