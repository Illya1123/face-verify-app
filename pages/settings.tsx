'use client'

import { useState, useEffect } from 'react'
import Page from '@/components/page'
import Section from '@/components/section'
import { useTheme } from 'next-themes'

const Settings = () => {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const isDark = resolvedTheme === 'dark'

    return (
        <Page>
            <Section>
                <h2 className="text-xl font-semibold">Settings</h2>

                <div className="mt-4">
                    <h3 className="font-medium mb-2">Theme</h3>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isDark}
                            onChange={() => setTheme(isDark ? 'light' : 'dark')}
                        />

                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>

                        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                            Dark Mode:{' '}
                            <span className="font-semibold">{isDark ? 'On' : 'Off'}</span>
                        </span>
                    </label>
                </div>
            </Section>

            <Section>
                <h3 className="font-medium">About</h3>

                <div className="mt-2">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        This tool is powered by <a href="https://github.com/Illya1123" className="underline">Illya1123</a> (Le Quoc Anh)
                    </p>
                </div>
            </Section>

            <Section>
                <h3 className="font-medium">Thanks to</h3>

                <ul className="list-disc space-y-2 px-6 py-2">
                    <li className="text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="https://unsplash.com" className="underline">
                            Unsplash
                        </a>{' '}
                        for high quality images
                    </li>

                    <li className="text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="https://teenyicons.com" className="underline">
                            Teenyicons
                        </a>{' '}
                        for lovely icons
                    </li>

                    <li className="text-sm text-zinc-600 dark:text-zinc-400">
                        <a href="https://github.com/justadudewhohacks/face-api.js" className="underline">
                            Face-api.js
                        </a>{' '}
                        for face recognition capabilities
                    </li>
                </ul>
            </Section>
        </Page>
    )
}

export default Settings
