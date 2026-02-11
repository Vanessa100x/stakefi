"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { UserAvatar } from "@/components/UserAvatar";
import Link from "next/link";
import { Trophy, ArrowUpRight } from "lucide-react";

interface LeaderboardEntry {
    wallet: string;
    score: number;
    received: number;
    given: number;
    x_username: string | null;
    display_name: string | null;
    pfp_url: string | null;
}

export default function LeaderboardPage() {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    async function fetchLeaderboard() {
        try {
            const res = await fetch("/api/leaderboard");
            const data = await res.json();
            setLeaders(data.leaderboard || []);
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setLoading(false);
        }
    }

    const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="min-h-screen grid-bg">
            <Header />

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse-slow">
                            <Trophy className="w-8 h-8 text-black fill-current" />
                        </div>
                        <h1 className="text-4xl font-bold mb-4 tracking-tight">Trust Leaderboard</h1>
                        <p className="text-xl text-[var(--text-secondary)]">
                            Top builders and contributors ranked by community reputation.
                        </p>
                    </div>

                    <div className="glass-card overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : leaders.length === 0 ? (
                            <div className="p-12 text-center text-[var(--text-secondary)]">
                                No reputation data yet. Start attesting!
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider text-[var(--text-muted)]">Rank</th>
                                            <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider text-[var(--text-muted)]">User</th>
                                            <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider text-[var(--text-muted)] text-right">Reputation</th>
                                            <th className="px-6 py-4 font-bold text-sm uppercase tracking-wider text-[var(--text-muted)] text-right">Attestations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leaders.map((entry, index) => (
                                            <tr key={entry.wallet} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-lg font-bold opacity-60">
                                                    #{index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Link href={`/profile/${entry.wallet}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                        <UserAvatar src={entry.pfp_url} size="md" />
                                                        <div>
                                                            <div className="font-bold flex items-center gap-2">
                                                                {entry.display_name || shortenAddress(entry.wallet)}
                                                                {entry.x_username && (
                                                                    <span className="text-xs font-normal text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                                                                        @{entry.x_username}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-[var(--text-secondary)] font-mono">
                                                                {shortenAddress(entry.wallet)}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-2xl font-bold gradient-text">
                                                        {entry.score}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="text-sm font-medium">
                                                        {entry.received} <span className="text-[var(--text-secondary)]">received</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
