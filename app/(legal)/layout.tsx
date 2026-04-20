
export default function LegalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[var(--color-background)] py-20 px-6">
            <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl p-8 md:p-12 shadow-sm border border-white/50">
                <article className="prose prose-slate lg:prose-lg hover:prose-a:text-primary transition-colors">
                    {children}
                </article>
            </div>
        </div>
    )
}
