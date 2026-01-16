'use client'

import Page from '@/components/page'
import Section from '@/components/section'

const Add = () => {
    return (
        <Page title="Add Face">
            <Section>
                <div className="text-center py-8">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Add New Face
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Thêm khuôn mặt mới vào cơ sở dữ liệu
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto">
                        <div className="text-6xl mb-4">➕</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Trang thêm khuôn mặt đang được phát triển...
                        </p>
                    </div>
                </div>
            </Section>
        </Page>
    )
}

export default Add
