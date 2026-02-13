"use client";

import { Header } from "@/components/Header";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect, use } from "react";
import { ethers } from "ethers";
import { ADDRESSES, PROJECT_REGISTRY_ABI, PROJECT_REWARDS_ABI } from "@/lib/contracts";
import { getTokenSymbol } from "@/lib/tokenUtils";
import Link from "next/link";

interface ProjectDetails {
    project_id: number;
    name: string;
    description: string;
    owner: string;
    reward_token: string;
    reward_amount: string;
    duration_days: number;
    approved: boolean;
    rewards_deposited: boolean;
    total_staked: number;
    start_time: string | null;
    end_time: string | null;
    tx_hash: string;
    created_at: string;
}

interface OnChainData {
    totalStaked: string;
    rewardRate: string;
    startTime: number;
    endTime: number;
    totalRewards: string;
    totalClaimed: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = parseInt(resolvedParams.id);

    const { authenticated, login } = usePrivy();
    const { wallets } = useWallets();

    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [rewardTokenSymbol, setRewardTokenSymbol] = useState("TOKEN");
    const [onChainData, setOnChainData] = useState<OnChainData | null>(null);
    const [userStake, setUserStake] = useState<{ amount: string; earned: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [stakeAmountUsd, setStakeAmountUsd] = useState("");
    const [ethPrice, setEthPrice] = useState<number | null>(null);
    const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [activeTab, setActiveTab] = useState<"overview" | "stake">("overview");

    useEffect(() => {
        fetchProject();
        fetchEthPrice();
    }, [projectId]);

    useEffect(() => {
        if (authenticated && project) {
            fetchUserStake();
        }
    }, [authenticated, project]);

    async function fetchProject() {
        try {
            // Fetch from Supabase
            const res = await fetch(`/api/projects/${projectId}`);
            const data = await res.json();

            if (data.project) {
                setProject(data.project);
            }

            // Fetch on-chain data
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
            );
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, provider);
            const registryAbi = ["function isProjectApproved(uint256 projectId) external view returns (bool)"];
            const registry = new ethers.Contract(ADDRESSES.projectRegistry, registryAbi, provider);

            try {
                const pool = await rewards.getRewardPool(projectId);
                const currentTotalStaked = ethers.formatEther(pool.totalStaked || 0);

                // Check on-chain approval status and total staked to sync with Supabase
                const onChainApproved = await registry.isProjectApproved(projectId);
                const needsApprovalSync = onChainApproved && data.project && !data.project.approved;
                const needsStakedSync = data.project && parseFloat(currentTotalStaked) !== parseFloat(data.project.total_staked || "0");

                if (needsApprovalSync || needsStakedSync) {
                    console.log("Desync detected. Syncing to Supabase...");
                    await fetch(`/api/projects/${projectId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            approved: onChainApproved,
                            total_staked: parseFloat(currentTotalStaked)
                        }),
                    });

                    if (data.project) {
                        setProject({
                            ...data.project,
                            approved: onChainApproved,
                            total_staked: parseFloat(currentTotalStaked)
                        });
                    }
                }

                setOnChainData({
                    totalStaked: currentTotalStaked,
                    rewardRate: "0", // Calculate from totalRewards/duration
                    startTime: Number(pool.startTime || 0),
                    endTime: Number(pool.endTime || 0),
                    totalRewards: ethers.formatEther(pool.totalRewards || 0),
                    totalClaimed: ethers.formatEther(pool.totalClaimed || 0),
                });

                // Fetch token symbol using optimized utility
                const symbol = await getTokenSymbol(data.project.reward_token, provider);
                setRewardTokenSymbol(symbol);
            } catch (e) {
                // Pool might not exist yet
                console.log("Pool not initialized yet or contract error", e);
            }
        } catch (error) {
            console.error("Error fetching project:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchUserStake() {
        if (!wallets[0]) return;

        try {
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL
            );
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, provider);
            const address = wallets[0].address;

            const stake = await rewards.getUserStake(projectId, address);
            const earned = await rewards.earned(projectId, address);

            setUserStake({
                amount: ethers.formatEther(stake.amount || 0),
                earned: ethers.formatEther(earned || 0),
            });
        } catch (e) {
            console.log("No stake found");
        }
    }

    async function fetchEthPrice() {
        try {
            const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
            const data = await res.json();
            if (data.ethereum?.usd) {
                setEthPrice(data.ethereum.usd);
            }
        } catch (error) {
            console.error("Error fetching ETH price:", error);
        }
    }

    async function getProvider() {
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet connected");
        const ethereumProvider = await wallet.getEthereumProvider();
        return new ethers.BrowserProvider(ethereumProvider);
    }

    async function ensureNetwork(wallet: any): Promise<boolean> {
        const chainId = Number(wallet.chainId);
        if (chainId === 11155111) return true;

        try {
            await wallet.switchChain(11155111);
            return true;
        } catch (error) {
            console.error("Failed to switch network:", error);
            alert("Please switch your wallet to Sepolia to continue.");
            return false;
        }
    }

    async function handleStake() {
        if (!authenticated || !stakeAmountUsd || !ethPrice || !wallets[0]) return;

        // Enforce network
        if (!(await ensureNetwork(wallets[0]))) return;

        setTxStatus("pending");
        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            // Convert USD to ETH
            const ethAmount = parseFloat(stakeAmountUsd) / ethPrice;
            const amountWei = ethers.parseEther(ethAmount.toFixed(18));

            const tx = await rewards.stake(projectId, {
                value: amountWei,
            });
            await tx.wait();

            setTxStatus("success");
            setStakeAmountUsd("");
            fetchUserStake();
            fetchProject();
        } catch (error: unknown) {
            console.error("Stake error:", error);
            setTxStatus("error");
            // Highlight ProjectNotApproved error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((error as any).data?.includes("0xfcf60071") || (error as any).message?.includes("0xfcf60071")) {
                alert("This project is not approved yet. Only approved projects can receive stakes.");
            }
        }
    }

    async function handleApprove() {
        if (!authenticated || !wallets[0]) return;

        // Enforce network
        if (!(await ensureNetwork(wallets[0]))) return;

        setTxStatus("pending");
        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const registryAbi = ["function approveProject(uint256 projectId) external"];
            const registry = new ethers.Contract(ADDRESSES.projectRegistry, registryAbi, signer);

            const tx = await registry.approveProject(projectId);
            await tx.wait();

            // Sync with Supabase
            await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approved: true }),
            });

            setTxStatus("success");
            fetchProject();
        } catch (error) {
            console.error("Approval error:", error);
            setTxStatus("error");
        }
    }

    async function handleClaim() {
        if (!authenticated || !wallets[0]) return;

        // Enforce network
        if (!(await ensureNetwork(wallets[0]))) return;

        setTxStatus("pending");
        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            const tx = await rewards.claimRewards(projectId);
            await tx.wait();

            setTxStatus("success");
            fetchUserStake();
        } catch (error) {
            console.error("Claim error:", error);
            setTxStatus("error");
        }
    }

    async function handleUnstake() {
        if (!authenticated || !wallets[0]) return;

        // Enforce network
        if (!(await ensureNetwork(wallets[0]))) return;

        setTxStatus("pending");
        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);

            const tx = await rewards.unstake(projectId);
            await tx.wait();

            setTxStatus("success");
            fetchUserStake();
            fetchProject();
        } catch (error) {
            console.error("Unstake error:", error);
            setTxStatus("error");
        }
    }

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Not set";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const calculateAPY = () => {
        if (!onChainData || !project) return "N/A";
        const totalRewards = parseFloat(onChainData.totalRewards);
        const totalStaked = parseFloat(onChainData.totalStaked);
        const durationDays = project.duration_days || 30;

        if (totalStaked === 0) return "∞";

        const dailyRate = totalRewards / durationDays / totalStaked;
        const apy = dailyRate * 365 * 100;
        return apy > 1000 ? ">1000%" : `${apy.toFixed(1)}%`;
    };

    const getTimeRemaining = () => {
        if (!onChainData || onChainData.endTime === 0) return "Not started";
        const now = Date.now() / 1000;
        const remaining = onChainData.endTime - now;

        if (remaining <= 0) return "Ended";

        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);

        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h remaining`;
    };

    if (loading) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <main className="pt-32 px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-[var(--text-secondary)] mt-4">Loading project...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <main className="pt-32 px-6">
                    <div className="max-w-4xl mx-auto text-center glass-card p-12">
                        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
                        <p className="text-[var(--text-secondary)] mb-6">
                            This project doesn&apos;t exist or hasn&apos;t been indexed yet.
                        </p>
                        <Link href="/projects" className="btn-primary">
                            Browse Projects
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg">
            <Header />

            <main className="pt-28 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Back Button */}
                    <Link href="/projects" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-white mb-6 transition-colors">
                        ← Back to Projects
                    </Link>

                    {/* Header */}
                    <div className="glass-card p-8 mb-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
                                    <span className="text-black font-bold text-2xl">{projectId}</span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
                                    {project.description && (
                                        <p className="text-[var(--text-secondary)] mb-3">{project.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {project.approved ? (
                                            <span className="badge badge-success">✓ Approved</span>
                                        ) : (
                                            <span className="badge badge-pending">Pending Approval</span>
                                        )}
                                        {project.rewards_deposited && (
                                            <span className="badge badge-success">Rewards Funded</span>
                                        )}
                                        {/* Admin Approve Button */}
                                        {!project.approved && (
                                            <button
                                                onClick={handleApprove}
                                                className="text-xs px-2 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded hover:bg-[var(--accent-green)]/30 transition-colors"
                                            >
                                                Admin Approve (Test Only)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-3xl font-bold text-[var(--accent-green)]">
                                    {calculateAPY()}
                                </div>
                                <div className="text-sm text-[var(--text-muted)]">Est. APY</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="stat-box">
                            <div className="stat-value truncate" title={onChainData?.totalStaked || "0"}>
                                {onChainData ? parseFloat(onChainData.totalStaked).toFixed(4) : "0"}
                            </div>
                            <div className="stat-label">ETH Staked</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{project.reward_amount} {rewardTokenSymbol}</div>
                            <div className="stat-label">Total Rewards</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value">{project.duration_days || "—"}</div>
                            <div className="stat-label">Duration (days)</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-value text-sm">{getTimeRemaining()}</div>
                            <div className="stat-label">Time Left</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === "overview"
                                ? "bg-[var(--accent-green)] text-black"
                                : "bg-white/5 hover:bg-white/10"
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab("stake")}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === "stake"
                                ? "bg-[var(--accent-green)] text-black"
                                : "bg-white/5 hover:bg-white/10"
                                }`}
                        >
                            Stake
                        </button>
                    </div>

                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Project Details */}
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-bold mb-4">Project Details</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Creator</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${project.owner}`}
                                            target="_blank"
                                            className="font-mono text-[var(--accent-green)] hover:underline"
                                        >
                                            {shortenAddress(project.owner)}
                                        </a>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Created</span>
                                        <span>{formatDate(project.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Start Time</span>
                                        <span>{onChainData?.startTime ? formatDate(new Date(onChainData.startTime * 1000).toISOString()) : "Pending"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">End Time</span>
                                        <span>{onChainData?.endTime ? formatDate(new Date(onChainData.endTime * 1000).toISOString()) : "Pending"}</span>
                                    </div>
                                    {project.tx_hash && (
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-secondary)]">Creation Tx</span>
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${project.tx_hash}`}
                                                target="_blank"
                                                className="font-mono text-[var(--accent-green)] hover:underline"
                                            >
                                                {shortenAddress(project.tx_hash)}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reward Token Info */}
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-bold mb-4">Reward Token</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Token Address</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/token/${project.reward_token}`}
                                            target="_blank"
                                            className="font-mono text-[var(--accent-green)] hover:underline"
                                        >
                                            {shortenAddress(project.reward_token)}
                                        </a>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Total Allocation</span>
                                        <span className="font-bold">{project.reward_amount} tokens</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Claimed</span>
                                        <span>{onChainData?.totalClaimed || "0"} tokens</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-secondary)]">Remaining</span>
                                        <span className="text-[var(--accent-green)]">
                                            {onChainData ?
                                                (parseFloat(onChainData.totalRewards) - parseFloat(onChainData.totalClaimed)).toFixed(4)
                                                : project.reward_amount
                                            } tokens
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Addresses */}
                            <div className="glass-card p-6 md:col-span-2">
                                <h2 className="text-lg font-bold mb-4">Smart Contracts</h2>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                        <span className="text-[var(--text-secondary)]">Project Registry</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${ADDRESSES.projectRegistry}`}
                                            target="_blank"
                                            className="font-mono text-[var(--accent-green)] hover:underline"
                                        >
                                            {shortenAddress(ADDRESSES.projectRegistry)}
                                        </a>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                        <span className="text-[var(--text-secondary)]">Project Rewards</span>
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${ADDRESSES.projectRewards}`}
                                            target="_blank"
                                            className="font-mono text-[var(--accent-green)] hover:underline"
                                        >
                                            {shortenAddress(ADDRESSES.projectRewards)}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stake Tab */}
                    {activeTab === "stake" && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Your Position */}
                            {authenticated && userStake && parseFloat(userStake.amount) > 0 && (
                                <div className="glass-card p-6 md:col-span-2">
                                    <h2 className="text-lg font-bold mb-4">Your Position</h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-black/20 rounded-xl overflow-hidden flex flex-col justify-between gap-4">
                                            <div>
                                                <div className="text-2xl font-bold truncate" title={userStake.amount}>
                                                    {parseFloat(userStake.amount).toFixed(4)} ETH
                                                </div>
                                                <div className="text-sm text-[var(--text-muted)]">Staked Amount</div>
                                            </div>
                                            <button
                                                onClick={handleUnstake}
                                                disabled={txStatus === "pending"}
                                                className="btn-secondary w-full py-2 min-h-[44px]"
                                            >
                                                Unstake
                                            </button>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-xl overflow-hidden flex flex-col justify-between gap-4 border border-[var(--accent-green)]/10">
                                            <div>
                                                <div className="text-2xl font-bold text-[var(--accent-green)] truncate" title={userStake.earned}>
                                                    {parseFloat(userStake.earned).toFixed(4)} {rewardTokenSymbol}
                                                </div>
                                                <div className="text-sm text-[var(--text-muted)]">Earned Rewards</div>
                                            </div>
                                            <button
                                                onClick={handleClaim}
                                                disabled={txStatus === "pending" || parseFloat(userStake.earned) === 0}
                                                className="btn-primary w-full py-2 min-h-[44px]"
                                            >
                                                Claim
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stake Form */}
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-bold mb-4">Stake ETH</h2>

                                {!project.approved ? (
                                    <div className="text-center py-8">
                                        <p className="text-[var(--text-secondary)]">
                                            This project is pending approval. Staking will be enabled once approved.
                                        </p>
                                    </div>
                                ) : !authenticated ? (
                                    <div className="text-center py-8">
                                        <p className="text-[var(--text-secondary)] mb-4">
                                            Connect your wallet to stake
                                        </p>
                                        <button onClick={login} className="btn-primary">
                                            Connect Wallet
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4">
                                            <label className="block text-sm text-[var(--text-secondary)] mb-2">
                                                Amount (USD)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    value={stakeAmountUsd}
                                                    onChange={(e) => setStakeAmountUsd(e.target.value)}
                                                    placeholder="100"
                                                    className="input-field pl-8 min-h-[44px]"
                                                />
                                            </div>
                                            {ethPrice && stakeAmountUsd && (
                                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                                    ≈ {(parseFloat(stakeAmountUsd) / ethPrice).toFixed(4)} ETH (@ ${ethPrice.toLocaleString()}/ETH)
                                                </p>
                                            )}
                                        </div>

                                        {txStatus === "pending" && (
                                            <div className="text-center mb-4">
                                                <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                                                <p className="text-sm text-[var(--text-secondary)] mt-2">
                                                    Confirming transaction...
                                                </p>
                                            </div>
                                        )}

                                        {txStatus === "success" && (
                                            <div className="text-center mb-4 text-[var(--accent-green)]">
                                                ✓ Transaction successful!
                                            </div>
                                        )}

                                        {txStatus === "error" && (
                                            <div className="text-center mb-4 text-red-400">
                                                ✗ Transaction failed
                                            </div>
                                        )}

                                        <button
                                            onClick={handleStake}
                                            disabled={!stakeAmountUsd || txStatus === "pending"}
                                            className="btn-primary w-full min-h-[48px] text-base"
                                        >
                                            {txStatus === "pending" ? "Processing..." : "Stake"}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-bold mb-4">How Staking Works</h2>
                                <div className="space-y-4 text-sm text-[var(--text-secondary)]">
                                    <div className="flex items-start gap-3">
                                        <span className="text-[var(--accent-green)]">1.</span>
                                        <p>Stake ETH as a <span className="text-white font-medium">signal of conviction</span>. Your ETH is never spent or paid to the project.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-[var(--accent-green)]">2.</span>
                                        <p>Earn a share of the <span className="text-white font-medium">immutable reward pool</span>. Distribution is linear and deterministic.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-[var(--accent-green)]">3.</span>
                                        <p>The contract is a neutral escrow. The project owner <span className="text-white font-medium">cannot rug or move</span> deposited rewards.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="text-[var(--accent-green)]">4.</span>
                                        <p>Withdraw your stake <span className="text-white font-medium">anytime</span>. Rules are dictated by code, not promises.</p>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <span>🛡️</span>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            <span className="text-white font-medium">Non-Custodial:</span> Your ETH stays in the smart contract and is only withdrawable by you.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
