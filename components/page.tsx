import Head from 'next/head'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import Appbar from '@/components/appbar'
import BottomNav from '@/components/bottom-nav'

interface Props {
    title?: string
    children: React.ReactNode
}

const Page = ({ title, children }: Props) => {
    const [isMobileApp, setIsMobileApp] = useState(false)
    const [forceMobileMode, setForceMobileMode] = useState(false)

    useEffect(() => {
        const platform = Capacitor.getPlatform()
        setIsMobileApp(platform === 'android' || platform === 'ios')

        // Check if user forced mobile mode in settings
        const savedMode = localStorage.getItem('forceMobileMode')
        setForceMobileMode(savedMode === 'true')
    }, [])

    const shouldUseMobileLayout = isMobileApp || forceMobileMode

    return (
        <>
            {title ? (
                <Head>
                    <title>Face Verify | {title}</title>
                </Head>
            ) : null}

            <Appbar />

            <main
                /**
                 * Padding top = `appbar` height
                 * Padding bottom = `bottom-nav` height
                 * Mobile app or forced mobile mode: always use mobile layout (pb-16, max-w-md)
                 * Web: responsive (sm:pb-0, max-w-screen-md)
                 */
                className={`mx-auto pt-20 pb-16 px-safe ${
                    shouldUseMobileLayout
                        ? 'max-w-md'
                        : 'max-w-screen-md sm:pb-0'
                }`}
            >
                <div className="p-6">{children}</div>
            </main>

            <BottomNav />
        </>
    )
}

export default Page
