'use client'

import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FaceModelsProvider } from '@/contexts/FaceModelsContext'
import '@/styles/globals.css'

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
      >
        <FaceModelsProvider>
          <Component {...pageProps} />
        </FaceModelsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
