'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import * as faceapi from 'face-api.js'
import { Capacitor } from '@capacitor/core'

interface FaceModelsContextType {
  modelsLoaded: boolean
  modelsLoading: boolean
  detectorType: 'mtcnn' | 'ssd'
}

const FaceModelsContext = createContext<FaceModelsContextType | undefined>(undefined)

const resolveModelUrl = () => {
  if (typeof window === 'undefined') return '/models'
  return `${window.location.origin}/models`
}

export const FaceModelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [detectorType, setDetectorType] = useState<'mtcnn' | 'ssd'>('ssd')

  useEffect(() => {
    let cancelled = false

    const loadModels = async () => {
      try {
        const isNative = Capacitor.isNativePlatform()
        const detector: 'mtcnn' | 'ssd' = isNative ? 'ssd' : 'mtcnn'
        setDetectorType(detector)

        console.log('[FaceAPI] Detector:', detector)

        await faceapi.tf.setBackend('webgl')
        await faceapi.tf.ready()

        const MODEL_URL = resolveModelUrl()

        if (detector === 'mtcnn') {
          await faceapi.nets.mtcnn.loadFromUri(MODEL_URL)
        } else {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        }

        await Promise.all([
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])

        if (!cancelled) setModelsLoaded(true)
      } catch (e) {
        console.error('[FaceAPI] loadModels failed', e)
      } finally {
        if (!cancelled) setModelsLoading(false)
      }
    }

    loadModels()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FaceModelsContext.Provider value={{ modelsLoaded, modelsLoading, detectorType }}>
      {children}
    </FaceModelsContext.Provider>
  )
}

export const useFaceModels = () => {
  const ctx = useContext(FaceModelsContext)
  if (!ctx) throw new Error('useFaceModels must be used within FaceModelsProvider')
  return ctx
}
