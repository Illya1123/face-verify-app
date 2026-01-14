import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const links = [
    { label: 'Settings', href: '/settings' },
]

const Appbar = () => {
    const router = useRouter()
    const [maxWidth, setMaxWidth] = useState('max-w-screen-md')

    useEffect(() => {
        const platform = Capacitor.getPlatform()
        const isMobileApp = platform === 'android' || platform === 'ios'
        const savedMode = localStorage.getItem('forceMobileMode')
        // Default to true if not set
        const forceMobileMode = savedMode === null ? true : savedMode === 'true'

        if (isMobileApp || forceMobileMode) {
            setMaxWidth('max-w-md')
        } else {
            setMaxWidth('max-w-screen-md')
        }
    }, [])

    return (
        <div className="fixed top-0 left-0 z-20 w-full bg-zinc-900 pt-safe">
            <header className="border-b bg-zinc-100 px-safe dark:border-zinc-800 dark:bg-zinc-900">
                <div className={`mx-auto flex h-20 items-center justify-between px-6 ${maxWidth}`}>
                    <Link href="/">
                        <h1 className="font-medium">Face Verify</h1>
                    </Link>

                    <nav className="flex items-center space-x-6">
                        <div className="hidden sm:block">
                            <div className="flex items-center space-x-6">
                                {links.map(({ label, href }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        className={`text-sm ${
                                            router.pathname === href
                                                ? 'text-indigo-500 dark:text-indigo-400'
                                                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                                        }`}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div
                            title="Gluten Free"
                            className="h-10 w-10 rounded-full bg-zinc-200 bg-cover bg-center shadow-inner dark:bg-zinc-800"
                            style={{
                                backgroundImage:
                                    'url(https://avatars.githubusercontent.com/u/108267658?v=4)',
                            }}
                        />
                    </nav>
                </div>
            </header>
        </div>
    )
}

export default Appbar
