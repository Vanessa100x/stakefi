"use client";

import { Header } from "@/components/Header";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ADDRESSES, PROJECT_REWARDS_ABI } from "@/lib/contracts";
import { getTokenSymbol } from "@/lib/tokenUtils";
import Link from "next/link";

interface UserStake {
    projectId: number;
    name?: string;
    amount: string;
    earned: string;
    rewardToken: string;
    symbol?: string;
}

export default function DashboardPage() {
    const { authenticated, user, login } = usePrivy();
    const { wallets } = useWallets();
    const [stakes, setStakes] = useState<UserStake[]>([]);
    const [totalStaked, setTotalStaked] = useState("0");
    const [totalEarned, setTotalEarned] = useState("0");
    const [loading, setLoading] = useState(true);
    const [claimingId, setClaimingId] = useState<number | null>(null);

    useEffect(() => {
        if (authenticated && user?.wallet?.address) {
            fetchUserStakes();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, user]);

    async function fetchUserStakes() {
        try {
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
            );

            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, provider);
            const userAddress = user?.wallet?.address;
            if (!userAddress) return;

            // Fetch all projects to check for stakes
            const res = await fetch("/api/projects");
            const data = await res.json();
            const allProjects = data.projects || [];

            const activeStakes: UserStake[] = [];

            // Check each project for a user stake
            // In a real app, this would be indexed, but for MVP it works for small numbers of projects
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await Promise.all(allProjects.map(async (project: any) => {
                try {
                    const stake = await rewards.getUserStake(project.project_id, userAddress);
                    // Updated ABI returns (amount, pendingRewards)
                    if (stake.amount > BigInt(0)) {
                        const earned = await rewards.earned(project.project_id, userAddress);

                        // Fetch token symbol using optimized utility
                        const symbol = await getTokenSymbol(project.reward_token, provider);

                        activeStakes.push({
                            projectId: project.project_id,
                            name: project.name,
                            amount: ethers.formatEther(stake.amount),
                            earned: ethers.formatEther(earned),
                            rewardToken: project.reward_token || "TOKEN",
                            symbol: symbol
                        });
                    }
                } catch (e) {
                    console.error(`Error checking stake for project ${project.project_id}:`, e);
                }
            }));

            setStakes(activeStakes.sort((a, b) => b.projectId - a.projectId));

            const total = activeStakes.reduce((acc, s) => acc + parseFloat(s.amount), 0);
            const totalEarnedVal = activeStakes.reduce((acc, s) => acc + parseFloat(s.earned), 0);
            setTotalStaked(total.toFixed(4));
            setTotalEarned(totalEarnedVal.toFixed(4));
        } catch (error) {
            console.error("Error fetching stakes:", error);
        } finally {
            setLoading(false);
        }
    }

    async function getProvider() {
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet connected");
        const ethereumProvider = await wallet.getEthereumProvider();
        return new ethers.BrowserProvider(ethereumProvider);
    }

    async function handleClaim(projectId: number) {
        if (!authenticated) return;

        setClaimingId(projectId);
        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            const tx = await rewards.claimRewards(projectId);
            await tx.wait();

            fetchUserStakes();
        } catch (error) {
            console.error("Claim error:", error);
        } finally {
            setClaimingId(null);
        }
    }

    async function handleUnstake(projectId: number) {
        if (!authenticated) return;

        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            const tx = await rewards.unstake(projectId);
            await tx.wait();

            fetchUserStakes();
        } catch (error) {
            console.error("Unstake error:", error);
        }
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <main className="pt-32 px-6">
                    <div className="max-w-md mx-auto text-center glass-card p-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-green)]/20 to-transparent flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">🔐</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
                        <p className="text-[var(--text-secondary)] mb-8">
                            Connect your wallet to view your stakes, rewards, and reputation.
                        </p>
                        <button onClick={login} className="btn-primary">
                            Connect Wallet
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg">
            <Header />

            <main className="pt-28 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="stat-box">
                            <div className="stat-value">{totalStaked}</div>
                            <div className="stat-label">ETH Staked</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{totalEarned}</div>
                            <div className="stat-label">Tokens Earned</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{stakes.length}</div>
                            <div className="stat-label">Active Stakes</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">--</div>
                            <div className="stat-label">Reputation Score</div>
                        </div>
                    </div>

                    {/* Active Stakes */}
                    <div className="glass-card p-6 mb-8">
                        <h2 className="text-xl font-bold mb-4">Your Stakes</h2>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : stakes.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-[var(--text-secondary)] mb-4">No active stakes</p>
                                <Link href="/projects" className="btn-primary">
                                    Browse Projects
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {stakes.map((stake) => (
                                    <div key={stake.projectId} className="flex flex-col lg:flex-row p-6 bg-black/20 rounded-2xl gap-6 border border-white/5 hover:border-white/10 transition-colors items-center overflow-hidden">
                                        {/* Project Info */}
                                        <div className="flex items-center gap-4 min-w-0 flex-grow max-w-full lg:max-w-[280px]">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
                                                <span className="text-black font-bold text-sm">{stake.projectId}</span>
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="font-bold truncate text-base mb-0.5" title={stake.name}>
                                                    {stake.name || `Project #${stake.projectId}`}
                                                </div>
                                                <Link href={`/projects/${stake.projectId}`} className="text-[10px] text-[var(--accent-green)] uppercase tracking-wider font-semibold hover:opacity-80">
                                                    View Detail →
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:flex-grow">
                                            {/* Staked Amount & Unstake */}
                                            <div className="flex items-center justify-between gap-4 bg-black/30 p-3.5 rounded-xl border border-white/5 min-w-0">
                                                <div className="min-w-0 flex-grow text-left">
                                                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight mb-1">Staked Amount</div>
                                                    <div className="font-bold truncate text-sm" title={stake.amount}>
                                                        {parseFloat(stake.amount).toFixed(4)} <span className="text-[10px] opacity-60">ETH</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnstake(stake.projectId)}
                                                    className="btn-secondary py-1.5 px-4 text-[11px] font-bold rounded-lg flex-shrink-0"
                                                >
                                                    Unstake
                                                </button>
                                            </div>

                                            {/* Earned Rewards & Claim */}
                                            <div className="flex items-center justify-between gap-4 bg-[var(--accent-green)]/5 p-3.5 rounded-xl border border-[var(--accent-green)]/20 min-w-0">
                                                <div className="min-w-0 flex-grow text-left">
                                                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight mb-1">Earned Rewards</div>
                                                    <div className="font-bold text-[var(--accent-green)] truncate text-sm" title={stake.earned}>
                                                        {parseFloat(stake.earned).toFixed(4)} <span className="text-[10px] opacity-70">{stake.symbol || "STAKE"}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleClaim(stake.projectId)}
                                                    disabled={claimingId === stake.projectId || parseFloat(stake.earned) === 0}
                                                    className="btn-primary py-1.5 px-4 text-[11px] font-bold rounded-lg flex-shrink-0"
                                                >
                                                    {claimingId === stake.projectId ? "..." : `Claim`}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Link href="/attest" className="glass-card p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-purple)]/20 to-transparent flex items-center justify-center">
                                    <span className="text-2xl">⭐</span>
                                </div>
                                <div>
                                    <h3 className="font-bold">Build Reputation</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Vouch for trusted wallets
                                    </p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/profile" className="glass-card p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-green)]/20 to-transparent flex items-center justify-center">
                                    <span className="text-2xl">👤</span>
                                </div>
                                <div>
                                    <h3 className="font-bold">View Profile</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        See your reputation score
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
