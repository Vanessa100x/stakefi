"use client";

import { Header } from "@/components/Header";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { authenticated, user, login, ready } = usePrivy();
    const router = useRouter();

    useEffect(() => {
        if (ready && authenticated && user?.wallet?.address) {
            router.replace(`/profile/${user.wallet.address}`);
        }
    }, [ready, authenticated, user, router]);

    if (!ready) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <div className="flex items-center justify-center h-screen">
                    <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // specific check to avoid flash of content
    if (authenticated && user?.wallet?.address) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-[var(--text-secondary)]">Redirecting...</div>
                </div>
            </div>
        );
    }

    // Not authenticated state
    return (
        <div className="min-h-screen grid-bg">
            <Header />
            <main className="pt-32 px-6">
                <div className="max-w-md mx-auto text-center glass-card p-12">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-purple)]/20 to-transparent flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">👤</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Connect your wallet to view your reputation score, projects, and attestations.
                    </p>
                    <button onClick={login} className="btn-primary w-full py-4 text-lg">
                        Connect Wallet
                    </button>
                </div>
            </main>
        </div>
    );
}
