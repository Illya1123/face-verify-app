import Link from 'next/link'
import { useRouter } from 'next/router'

const BottomNav = () => {
    const router = useRouter()

    return (
        <nav className="fixed bottom-0 left-0 right-0 w-full border-t bg-white pb-safe dark:border-zinc-800 dark:bg-zinc-900 z-50">
            <div className="flex h-16 items-center justify-around px-6 relative">
                {links.map(({ href, label, icon, isCenter }) => (
                    <Link
                        key={label}
                        href={href}
                        className={`flex h-full flex-col items-center justify-center space-y-1 ${
                            isCenter
                                ? 'absolute left-1/2 -translate-x-1/2 -top-4'
                                : 'flex-1'
                        }`}
                    >
                        {isCenter ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center shadow-lg">
                                    {icon}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={router.pathname === href
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-600 dark:text-zinc-400'}>
                                    {icon}
                                </div>
                                <span className={`text-xs ${router.pathname === href
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    {label}
                                </span>
                            </>
                        )}
                    </Link>
                ))}
            </div>
        </nav>
    )
}

export default BottomNav

const links = [
    {
        label: 'Home',
        href: '/',
        isCenter: false,
        icon: (
            <svg
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
            >
                <path
                    d="M7.5.5l.325-.38a.5.5 0 00-.65 0L7.5.5zm-7 6l-.325-.38L0 6.27v.23h.5zm5 8v.5a.5.5 0 00.5-.5h-.5zm4 0H9a.5.5 0 00.5.5v-.5zm5-8h.5v-.23l-.175-.15-.325.38zM1.5 15h4v-1h-4v1zm13.325-8.88l-7-6-.65.76 7 6 .65-.76zm-7.65-6l-7 6 .65.76 7-6-.65-.76zM6 14.5v-3H5v3h1zm3-3v3h1v-3H9zm.5 3.5h4v-1h-4v1zm5.5-1.5v-7h-1v7h1zm-15-7v7h1v-7H0zM7.5 10A1.5 1.5 0 019 11.5h1A2.5 2.5 0 007.5 9v1zm0-1A2.5 2.5 0 005 11.5h1A1.5 1.5 0 017.5 10V9zm6 6a1.5 1.5 0 001.5-1.5h-1a.5.5 0 01-.5.5v1zm-12-1a.5.5 0 01-.5-.5H0A1.5 1.5 0 001.5 15v-1z"
                    fill="currentColor"
                />
            </svg>
        ),
    },
    {
        label: 'Camera',
        href: '/camera',
        isCenter: true,
        icon: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
            >
                <path
                    d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle
                    cx="12"
                    cy="13"
                    r="4"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        ),
    },
    {
        label: 'Settings',
        href: '/settings',
        isCenter: false,
        icon: (
            <svg
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
            >
                <path
                    d="M7.5 15V7m0 .5v3m0-3a4 4 0 00-4-4h-3v3a4 4 0 004 4h3m0-3h3a4 4 0 004-4v-3h-3a4 4 0 00-4 4v3zm0 0l4-4m-4 7l-4-4"
                    stroke="currentColor"
                />
            </svg>
        ),
    },
]
