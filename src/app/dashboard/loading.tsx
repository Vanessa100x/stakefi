import { Header } from "@/components/Header";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen grid-bg">
            <Header />
            <main className="pt-28 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header Skeleton */}
                    <div className="h-10 w-48 bg-white/10 rounded-lg mb-8 animate-pulse" />

                    {/* Stats Grid Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="stat-box h-24 animate-pulse bg-white/5" />
                        ))}
                    </div>

                    {/* Main Card Skeleton */}
                    <div className="glass-card p-6 h-64 animate-pulse bg-white/5" />
                </div>
            </main>
        </div>
    );
}
