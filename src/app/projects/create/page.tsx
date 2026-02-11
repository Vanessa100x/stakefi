"use client";

import { Header } from "@/components/Header";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { ethers } from "ethers";
import { ADDRESSES, PROJECT_REGISTRY_ABI, PROJECT_REWARDS_ABI } from "@/lib/contracts";
import { getTokenSymbol } from "@/lib/tokenUtils";
import { useRegisterUser } from "@/hooks/useRegisterUser";
import Link from "next/link";

export default function CreateProjectPage() {
    useRegisterUser();

    const { authenticated, login } = usePrivy();
    const { wallets } = useWallets();
    const [step, setStep] = useState(1);
    const [projectId, setProjectId] = useState<number | null>(null);

    // Form state
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [rewardToken, setRewardToken] = useState("");
    const [rewardTokenSymbol, setRewardTokenSymbol] = useState("");
    const [rewardAmount, setRewardAmount] = useState("");
    const [duration, setDuration] = useState("7"); // days

    const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [currentTx, setCurrentTx] = useState("");

    // Get provider from Privy wallet
    async function getProvider() {
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet connected");

        // Get the wallet's provider
        const ethereumProvider = await wallet.getEthereumProvider();
        return new ethers.BrowserProvider(ethereumProvider);
    }

    async function handleRegisterProject() {
        if (!authenticated || !projectName || !rewardToken || !rewardAmount) return;

        if (!ethers.isAddress(rewardToken)) {
            setErrorMsg("Invalid token address");
            return;
        }

        setTxStatus("pending");
        setCurrentTx("Registering project...");
        setErrorMsg("");

        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();

            const registry = new ethers.Contract(ADDRESSES.projectRegistry, PROJECT_REGISTRY_ABI, signer);

            // Convert reward amount to wei (assuming 18 decimals)
            const amountWei = ethers.parseEther(rewardAmount);

            const tx = await registry.registerProject(rewardToken, amountWei);
            const receipt = await tx.wait();

            // Get project ID from event
            let id = 0;
            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = registry.interface.parseLog(log);
                    return parsed?.name === "ProjectRegistered";
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = registry.interface.parseLog(event);
                id = Number(parsed?.args[0]);
                setProjectId(id);
            }

            // Save to Supabase
            setCurrentTx("Saving project...");
            await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: id,
                    owner: signerAddress,
                    name: projectName,
                    description: description,
                    rewardToken: rewardToken,
                    rewardTokenSymbol: rewardTokenSymbol || "TOKEN",
                    rewardAmount: rewardAmount,
                    duration: parseInt(duration),
                    txHash: receipt.hash,
                }),
            });

            setTxStatus("success");
            setStep(2);
        } catch (error: unknown) {
            console.error("Register error:", error);
            setTxStatus("error");
            setErrorMsg((error as Error).message?.slice(0, 100) || "Transaction failed");
        }
    }

    async function handleDepositRewards() {
        if (!authenticated || projectId === null) return;

        setTxStatus("pending");
        setCurrentTx("Approving tokens...");
        setErrorMsg("");

        try {
            const provider = await getProvider();
            const signer = await provider.getSigner();

            const amountWei = ethers.parseEther(rewardAmount);
            const durationSeconds = parseInt(duration) * 24 * 60 * 60;

            // First approve tokens
            const tokenAbi = ["function approve(address spender, uint256 amount) returns (bool)"];
            const token = new ethers.Contract(rewardToken, tokenAbi, signer);

            const approveTx = await token.approve(ADDRESSES.projectRewards, amountWei);
            await approveTx.wait();

            setCurrentTx("Depositing rewards...");

            // Then deposit
            const rewards = new ethers.Contract(ADDRESSES.projectRewards, PROJECT_REWARDS_ABI, signer);
            const depositTx = await rewards.depositRewards(projectId, rewardToken, amountWei, durationSeconds);
            await depositTx.wait();

            // Sync with Supabase
            await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewards_deposited: true }),
            });

            setTxStatus("success");
            setStep(3);
        } catch (error: unknown) {
            console.error("Deposit error:", error);
            setTxStatus("error");
            setErrorMsg((error as Error).message?.slice(0, 100) || "Transaction failed");
        }
    }

    if (!authenticated) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <main className="pt-32 px-6">
                    <div className="max-w-md mx-auto text-center glass-card p-12">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-green)]/20 to-transparent flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">🚀</span>
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Create a Project</h1>
                        <p className="text-[var(--text-secondary)] mb-8">
                            Connect your wallet to create a staking project
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
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold mb-3">Create a Project</h1>
                        <p className="text-[var(--text-secondary)]">
                            Set up a staking pool and attract stakers to your project
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-4 mb-10">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s
                                    ? "bg-[var(--accent-green)] text-black"
                                    : "bg-white/10 text-[var(--text-muted)]"
                                    }`}>
                                    {step > s ? "✓" : s}
                                </div>
                                {s < 3 && <div className={`w-16 h-0.5 ${step > s ? "bg-[var(--accent-green)]" : "bg-white/10"}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Register Project */}
                    {step === 1 && (
                        <div className="glass-card p-8 animate-fade-in">
                            <h2 className="text-xl font-bold mb-6">Step 1: Register Project</h2>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="e.g. DeFi Protocol V2"
                                    className="input-field"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of your project and what stakers can expect..."
                                    rows={3}
                                    className="input-field resize-none"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">
                                    Reward Token Address *
                                </label>
                                <input
                                    type="text"
                                    value={rewardToken}
                                    onChange={(e) => setRewardToken(e.target.value)}
                                    placeholder="0x... (ERC20 token address)"
                                    className="input-field font-mono"
                                    onBlur={async () => {
                                        if (ethers.isAddress(rewardToken)) {
                                            const provider = await getProvider();
                                            const symbol = await getTokenSymbol(rewardToken, provider);
                                            setRewardTokenSymbol(symbol);
                                        }
                                    }}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {rewardTokenSymbol ? `Token: ${rewardTokenSymbol}` : "The ERC20 token you'll use to reward stakers"}
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">
                                    Total Reward Amount
                                </label>
                                <input
                                    type="text"
                                    value={rewardAmount}
                                    onChange={(e) => setRewardAmount(e.target.value)}
                                    placeholder="1000"
                                    className="input-field"
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Total tokens to distribute to stakers
                                </p>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-medium mb-2">
                                    Reward Duration (days)
                                </label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="7">7 days</option>
                                    <option value="14">14 days</option>
                                    <option value="30">30 days</option>
                                    <option value="60">60 days</option>
                                    <option value="90">90 days</option>
                                </select>
                            </div>

                            {txStatus === "pending" && (
                                <div className="text-center mb-4">
                                    <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-sm text-[var(--text-secondary)] mt-2">{currentTx}</p>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="text-center mb-4 p-4 bg-red-500/10 rounded-xl">
                                    <span className="text-red-400 text-sm">✗ {errorMsg}</span>
                                </div>
                            )}

                            <button
                                onClick={handleRegisterProject}
                                disabled={!rewardToken || !rewardAmount || txStatus === "pending"}
                                className="btn-primary w-full text-lg py-4"
                            >
                                {txStatus === "pending" ? "Processing..." : "Register Project"}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Deposit Rewards */}
                    {step === 2 && (
                        <div className="glass-card p-8 animate-fade-in">
                            <h2 className="text-xl font-bold mb-6">Step 2: Deposit Rewards</h2>

                            <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 rounded-xl p-4 mb-6">
                                <p className="text-[var(--accent-green)] font-medium">
                                    ✓ Project #{projectId} registered successfully!
                                </p>
                            </div>

                            <div className="glass-card p-4 mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--text-secondary)]">Token</span>
                                    <span className="font-mono">{rewardToken.slice(0, 10)}...</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--text-secondary)]">Amount</span>
                                    <span>{rewardAmount} tokens</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Duration</span>
                                    <span>{duration} days</span>
                                </div>
                            </div>

                            <div className="bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <span className="text-lg">ℹ️</span>
                                    <div className="text-sm text-[var(--text-secondary)]">
                                        <p>This will:</p>
                                        <ol className="list-decimal ml-4 mt-1">
                                            <li>Approve token transfer</li>
                                            <li>Deposit tokens to the rewards contract</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {txStatus === "pending" && (
                                <div className="text-center mb-4">
                                    <div className="w-6 h-6 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-sm text-[var(--text-secondary)] mt-2">{currentTx}</p>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="text-center mb-4 p-4 bg-red-500/10 rounded-xl">
                                    <span className="text-red-400 text-sm">✗ {errorMsg}</span>
                                </div>
                            )}

                            <button
                                onClick={handleDepositRewards}
                                disabled={txStatus === "pending"}
                                className="btn-primary w-full text-lg py-4"
                            >
                                {txStatus === "pending" ? "Processing..." : "Approve & Deposit Rewards"}
                            </button>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <div className="glass-card p-8 text-center animate-fade-in">
                            <div className="w-20 h-20 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🎉</span>
                            </div>

                            <h2 className="text-2xl font-bold mb-4">Project Created!</h2>

                            <p className="text-[var(--text-secondary)] mb-6">
                                Your project #{projectId} is now registered and funded.
                                <br />
                                The owner (admin) needs to approve it before staking can begin.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/projects" className="btn-primary">
                                    View Projects
                                </Link>
                                <Link href="/dashboard" className="btn-secondary">
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
