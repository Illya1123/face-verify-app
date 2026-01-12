import { useQuery } from '@tanstack/react-query'
import * as faceapi from 'face-api.js'
import { MODEL_URL } from '@/constants/faceVerification'

export const useFaceModels = () => {
    const { data: modelsLoaded = false, isLoading: modelsLoading } = useQuery({
        queryKey: ['faceModels'],
        queryFn: async () => {
            // Load only essential models for accurate face verification
            await Promise.all([
                // MTCNN: Most accurate face detector
                faceapi.nets.mtcnn.loadFromUri(MODEL_URL),
                // Face Landmark 68: Full landmarks for better alignment
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                // Face Recognition: Core model for face comparison (128D descriptor)
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ])
            return true
        },
        staleTime: Infinity,
    })

    return { modelsLoaded, modelsLoading }
}
