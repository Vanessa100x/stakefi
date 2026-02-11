"use client";

import { Header } from "@/components/Header";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchResult {
    wallet: string;
    created_at: string;
    x_username?: string;
    display_name?: string;
    pfp_url?: string;
}

export default function AttestPage() {
    const { authenticated, user, login } = usePrivy();
    const router = useRouter();

    const [targetWallet, setTargetWallet] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    // Search users as they type
    useEffect(() => {
        const timer = setTimeout(() => {
            if (targetWallet.length >= 3) {
                searchUsers(targetWallet);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [targetWallet]);

    async function searchUsers(query: string) {
        setSearching(true);
        try {
            const res = await fetch(`/api/users?q=${query}`);
            const data = await res.json();
            setSearchResults(data.users || []);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setSearching(false);
        }
    }

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="min-h-screen grid-bg">
            <Header />

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse-slow">
                            <span className="text-4xl">🔍</span>
                        </div>
                        <h1 className="text-4xl font-bold mb-4 tracking-tight">Find & Vouch for Builders</h1>
                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Search for wallets to view their reputation score, project history, and leave on-chain attestations.
                        </p>
                    </div>

                    <div className="max-w-2xl mx-auto glass-card p-8 border border-[var(--accent-purple)]/20 shadow-2xl relative z-20">
                        {/* Search Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={targetWallet}
                                onChange={(e) => setTargetWallet(e.target.value)}
                                placeholder="Search by wallet address (0x...)"
                                className="w-full bg-black/50 border border-[var(--border-color)] rounded-xl py-4 pl-14 pr-4 text-lg font-mono focus:outline-none focus:border-[var(--accent-green)] focus:ring-1 focus:ring-[var(--accent-green)] transition-all placeholder:text-[var(--text-muted)]"
                                autoFocus
                            />
                            {searching && (
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <div className="w-5 h-5 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {(searchResults.length > 0 || (targetWallet.length >= 3 && !searching)) && (
                            <div className="absolute left-0 right-0 top-full mt-2 mx-8 glass-card border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto">
                                {searchResults.length > 0 ? (
                                    searchResults.map((result) => (
                                        <button
                                            key={result.wallet}
                                            onClick={() => router.push(`/profile/${result.wallet}`)}
                                            className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors border-b border-[var(--border-color)] last:border-b-0 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                {result.pfp_url ? (
                                                    <img
                                                        src={result.pfp_url}
                                                        alt={result.x_username || "User"}
                                                        className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-[var(--accent-green)] transition-colors"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bg-dark)] to-gray-800 flex items-center justify-center border border-white/10 group-hover:border-[var(--accent-green)] transition-colors">
                                                        <span className="text-xs">👤</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-mono text-base font-medium group-hover:text-[var(--accent-green)] transition-colors">
                                                        {result.x_username ? `@${result.x_username}` : shortenAddress(result.wallet)}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)]">
                                                        {result.display_name || (result.x_username ? shortenAddress(result.wallet) : `Joined ${new Date(result.created_at).toLocaleDateString()}`)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform">→</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-[var(--text-secondary)]">
                                        <div className="text-4xl mb-2">🤷‍♂️</div>
                                        <p>No user found via search.</p>
                                        {authenticated && (
                                            <p className="text-sm mt-2 text-[var(--text-muted)]">
                                                (You are registered automatically when you connect)
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Stats / Footer */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl mb-2">🤝</div>
                            <h3 className="font-bold mb-1">Peer-to-Peer Trust</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Vouch for others to build a web of trust</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl mb-2">🏆</div>
                            <h3 className="font-bold mb-1">Reputation Score</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Earn a score based on who vouches for you</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="text-3xl mb-2">🚀</div>
                            <h3 className="font-bold mb-1">Project History</h3>
                            <p className="text-sm text-[var(--text-secondary)]">Showcase your launched projects and track record</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
