// MODULE_11 참조: 알림 설정 페이지
// /dashboard/settings/notifications
'use client'

export default function NotificationSettingsPage() {
    // TODO: MODULE_11 - notification_settings 테이블에서 유저 설정 로드
    // TODO: MODULE_11 - 토글 스위치로 설정 변경

    const settings = {
        email_letter_updates: true,
        email_pet_events: true,
        email_marketing: false,
        in_app_sounds: true,
    }

    return (
        <main className="container" style={{ paddingTop: '120px', maxWidth: '800px' }}>
            <h1 className="text-h2 mb-8">Notification Settings</h1>

            <div className="step-card">
                <h2 className="text-xl font-bold mb-6">Email Notifications</h2>

                {[
                    { key: 'email_letter_updates', label: 'Letter Updates', desc: 'Get notified when your letter is delivered or a reply arrives' },
                    { key: 'email_pet_events', label: 'Pet Events', desc: 'Weekly summary of your pet\'s activities in ToThereOn World' },
                    { key: 'email_marketing', label: 'Marketing', desc: 'Occasional updates about new features and promotions' },
                ].map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between py-4"
                        style={{ borderBottom: '1px solid var(--color-border-light)' }}
                    >
                        <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{item.desc}</p>
                        </div>
                        {/* TODO: MODULE_11 - Toggle switch 컴포넌트 */}
                        <div
                            className="w-12 h-6 rounded-full cursor-pointer transition-all"
                            style={{
                                background: settings[item.key as keyof typeof settings]
                                    ? 'var(--color-primary)' : 'var(--color-border)',
                            }}
                        >
                            <div
                                className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5"
                                style={{
                                    marginLeft: settings[item.key as keyof typeof settings] ? '26px' : '2px',
                                }}
                            />
                        </div>
                    </div>
                ))}

                <h2 className="text-xl font-bold mb-6 mt-8">In-App</h2>
                <div className="flex items-center justify-between py-4">
                    <div>
                        <p className="font-medium">Sound Effects</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Play sounds for new notifications</p>
                    </div>
                    <div
                        className="w-12 h-6 rounded-full cursor-pointer transition-all"
                        style={{
                            background: settings.in_app_sounds ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                    >
                        <div
                            className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5"
                            style={{ marginLeft: settings.in_app_sounds ? '26px' : '2px' }}
                        />
                    </div>
                </div>
            </div>
        </main>
    )
}
