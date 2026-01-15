import Head from 'next/head'
import Appbar from '@/components/appbar'
import BottomNav from '@/components/bottom-nav'

interface Props {
    title?: string
    children: React.ReactNode
}

const Page = ({ title, children }: Props) => {
    return (
        <>
            {title ? (
                <Head>
                    <title>Face Verify | {title}</title>
                </Head>
            ) : null}

            {/* <Appbar /> */}

            <main
                /**
                 * Full width mobile layout with safe areas
                 */
                className="w-full min-h-screen flex flex-col pt-safe pb-safe"
                style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
                <div className="flex-1 px-4 py-4 sm:px-6">{children}</div>
            </main>

            <BottomNav />
        </>
    )
}

export default Page
