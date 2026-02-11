"use client";

import { Header } from "@/components/Header";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ADDRESSES, PROJECT_REWARDS_ABI } from "@/lib/contracts";
import { getTokenSymbol } from "@/lib/tokenUtils";
import Link from "next/link";

interface Project {
    id: number;
    name: string;
    description: string;
    owner: string;
    rewardToken: string;
    rewardTokenSymbol?: string;
    rewardAmount: string;
    approved: boolean;
    totalStaked: string;
    apy: string;
    endTime: number;
}

export default function ProjectsPage() {
    const { authenticated } = usePrivy();
    const { wallets } = useWallets();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [stakeAmount, setStakeAmount] = useState("");
    const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            // Fetch projects from Supabase via API
            const res = await fetch("/api/projects");
            const data = await res.json();

            if (data.projects && Array.isArray(data.projects)) {
                const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedProjects: Project[] = await Promise.all(data.projects.map(async (p: any) => {
                    // Use cached symbol if available, otherwise fetch
                    let symbol = p.reward_token_symbol;
                    if (!symbol) {
                        try {
                            symbol = await getTokenSymbol(p.reward_token, provider);
                        } catch (e) {
                            symbol = "TOKEN";
                        }
                    }

                    return {
                        id: p.project_id,
                        name: p.name || `Project #${p.project_id}`,
                        description: p.description || "",
                        owner: p.owner,
                        rewardToken: p.reward_token,
                        rewardTokenSymbol: symbol,
                        rewardAmount: p.reward_amount || "0",
                        approved: p.approved || false,
                        totalStaked: p.total_staked ? String(p.total_staked) : "0",
                        apy: "TBD",
                        endTime: p.end_time ? new Date(p.end_time).getTime() : Date.now() + 86400000 * 7,
                    };
                }));
                setProjects(mappedProjects);
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error("Error fetching projects:", error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleStake(project: Project) {
        if (!authenticated || !stakeAmount) return;

        setTxStatus("pending");
        try {
            const wallet = wallets[0];
            if (!wallet) throw new Error("No wallet connected");

            const ethereumProvider = await wallet.getEthereumProvider();
            const provider = new ethers.BrowserProvider(ethereumProvider);
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            const tx = await rewards.stake(project.id, {
                value: ethers.parseEther(stakeAmount),
            });

            await tx.wait();

            // Log stake to backend
            await fetch("/api/stakes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.id,
                    userWallet: wallet.address,
                    amount: stakeAmount,
                    txHash: tx.hash
                })
            });

            setTxStatus("success");
            setSelectedProject(null);
            setStakeAmount("");
            fetchProjects();
        } catch (error) {
            console.error("Stake error:", error);
            setTxStatus("error");
        }
    }

    return (
        <div className="min-h-screen grid-bg">
            <Header />

            <main className="pt-28 pb-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">Projects</h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Browse approved projects and start staking
                            </p>
                        </div>
                        {authenticated && (
                            <Link href="/projects/create" className="btn-primary">
                                + Create Project
                            </Link>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-[var(--text-secondary)] mt-4">Loading projects...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-20 glass-card">
                            <p className="text-[var(--text-secondary)]">No approved projects yet</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {projects.map((project) => (
                                <div key={project.id} className="glass-card p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <Link href={`/projects/${project.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] flex items-center justify-center">
                                                <span className="text-black font-bold">{project.id}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg hover:text-[var(--accent-green)] transition-colors">{project.name}</h3>
                                                <p className="text-[var(--text-secondary)] text-sm">
                                                    Reward: {project.rewardAmount} {project.rewardTokenSymbol}
                                                </p>
                                                {project.description && (
                                                    <p className="text-[var(--text-muted)] text-xs mt-1 line-clamp-1">
                                                        {project.description}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <div className="text-[var(--accent-green)] font-bold">{project.apy}</div>
                                                <div className="text-xs text-[var(--text-muted)]">Est. APY</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold">{project.totalStaked} ETH</div>
                                                <div className="text-xs text-[var(--text-muted)]">Total Staked</div>
                                            </div>
                                            <div>
                                                {project.approved ? (
                                                    <span className="badge badge-success">Active</span>
                                                ) : (
                                                    <span className="badge badge-pending">Pending</span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedProject(project)}
                                            className="btn-primary"
                                            disabled={!project.approved}
                                        >
                                            Stake
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Stake Modal */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="glass-card p-8 max-w-md w-full animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Stake on Project #{selectedProject.id}</h2>
                            <button
                                onClick={() => {
                                    setSelectedProject(null);
                                    setTxStatus("idle");
                                }}
                                className="text-[var(--text-muted)] hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                Amount (ETH)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                placeholder="0.1"
                                className="input-field"
                            />
                        </div>

                        <div className="glass-card p-4 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-[var(--text-secondary)]">Est. APY</span>
                                <span className="text-[var(--accent-green)]">{selectedProject.apy}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Reward Token</span>
                                <span>{selectedProject.rewardTokenSymbol} ({selectedProject.rewardToken.slice(0, 6)}...)</span>
                            </div>
                        </div>

                        {txStatus === "pending" && (
                            <div className="text-center mb-4">
                                <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-sm text-[var(--text-secondary)] mt-2">Confirming transaction...</p>
                            </div>
                        )}

                        {txStatus === "success" && (
                            <div className="text-center mb-4 text-[var(--accent-green)]">
                                ✓ Stake successful!
                            </div>
                        )}

                        {txStatus === "error" && (
                            <div className="text-center mb-4 text-red-400">
                                ✗ Transaction failed
                            </div>
                        )}

                        <button
                            onClick={() => handleStake(selectedProject)}
                            disabled={!stakeAmount || txStatus === "pending" || !authenticated}
                            className="btn-primary w-full"
                        >
                            {!authenticated ? "Connect Wallet" : txStatus === "pending" ? "Processing..." : "Stake ETH"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
