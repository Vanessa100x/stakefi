import { Header } from "@/components/Header";

export default function ProjectsLoading() {
    return (
        <div className="min-h-screen grid-bg">
            <Header />
            <main className="pt-28 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Title Skeleton */}
                    <div className="flex justify-between mb-8">
                        <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse" />
                        <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
                    </div>

                    {/* Project Cards Skeleton */}
                    <div className="grid gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass-card p-6 h-32 animate-pulse bg-white/5" />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
