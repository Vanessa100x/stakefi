"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { ADDRESSES, ATTESTATION_ABI } from "@/lib/contracts";
import { Header } from "@/components/Header";
import { useParams } from "next/navigation";
import { Star, Shield, Activity, Calendar, User, Edit2, Trash2, CheckCircle, AlertCircle, Twitter } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

// Define TypeScript interfaces for our data
interface ProfileData {
    wallet: string;
    joined_at: string | null;
    last_seen: string | null;
    x_username?: string | null;
    display_name?: string | null;
    pfp_url?: string | null;
    reputation: {
        score: number;
        received_count: number;
        given_count: number;
    };
    attestations: {
        from_wallet: string;
        score: number;
        comment?: string;
        created_at: string;
        tx_hash: string;
        revoked_at?: string | null;
    }[];
    projects: {
        id: number;
        name: string;
        description: string;
        created_at: string;
    }[];
}

export default function PublicProfilePage() {
    const params = useParams();
    const walletAddress = params.wallet as string;

    // Auth & Wallet hooks
    const { authenticated, user, login, linkTwitter, unlinkTwitter } = usePrivy();
    const { wallets } = useWallets();

    // State
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "attestations" | "projects">("overview");

    // Attestation specific state
    const [showAttestModal, setShowAttestModal] = useState(false);
    const [attestScore, setAttestScore] = useState(3);
    const [attestComment, setAttestComment] = useState("");
    const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Fetch profile data
    useEffect(() => {
        if (walletAddress) {
            fetchProfile(walletAddress);
        }
    }, [walletAddress]);

    // Refetch when Privy user updates (e.g. after linking Twitter)
    // We add a delay to allow the Header component to sync data to the backend first
    useEffect(() => {
        if (authenticated && user?.wallet?.address?.toLowerCase() === walletAddress.toLowerCase()) {
            if (user?.twitter?.username && profile && !profile.x_username) {
                const timer = setTimeout(() => {
                    fetchProfile(walletAddress);
                }, 1000); // Wait 1s for backend sync
                return () => clearTimeout(timer);
            }
        }
    }, [user?.twitter?.username, profile, walletAddress, authenticated]);

    async function fetchProfile(address: string) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/users/${address}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch profile");
            }

            if (data.profile) {
                setProfile(data.profile);
            } else {
                setError("User profile data is missing");
            }
        } catch (error: unknown) {
            console.error("Failed to load profile:", error);
            setError((error as Error).message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    }

    const shortenAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    // --- Attestation Logic ---
    const scores = [
        { value: -1, label: "Negative", color: "text-red-400", desc: "Do not trust" },
        { value: 0, label: "Neutral", color: "text-gray-400", desc: "No opinion" },
        { value: 1, label: "Low", color: "text-yellow-400", desc: "Minimal trust" },
        { value: 2, label: "Okay", color: "text-yellow-300", desc: "Some trust" },
        { value: 3, label: "Good", color: "text-green-400", desc: "Trustworthy" },
        { value: 4, label: "Great", color: "text-green-300", desc: "Very trusted" },
        { value: 5, label: "Excellent", color: "text-[var(--accent-green)]", desc: "Highly trusted" },
    ];

    async function handleAttest() {
        if (!authenticated || !walletAddress) return;

        // Prevent self-attestation
        if (walletAddress.toLowerCase() === user?.wallet?.address?.toLowerCase()) {
            setErrorMsg("Cannot attest to yourself");
            return;
        }

        // One attestation per pair
        const alreadyAttested = profile?.attestations.some(
            (a) => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase() && !a.revoked_at
        );

        if (alreadyAttested) {
            setErrorMsg("You have already attested to this user.");
            return;
        }

        setTxStatus("pending");
        setErrorMsg("");

        try {
            const currentWallet = wallets[0];
            if (!currentWallet) throw new Error("No wallet connected");

            const ethereumProvider = await currentWallet.getEthereumProvider();
            const provider = new ethers.BrowserProvider(ethereumProvider);
            const signer = await provider.getSigner();
            const attestationContract = new ethers.Contract(ADDRESSES.attestation, ATTESTATION_ABI, signer);

            // 1. Check On-Chain State First
            // We do this because the indexer might be behind, causing the "missing revert data" error on duplicate
            const alreadyExists = await attestationContract.hasAttestation(
                user?.wallet?.address,
                walletAddress
            );

            if (alreadyExists) {
                // Check if it's already in our local profile state
                const inProfile = profile?.attestations.some(
                    (a) => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase() && !a.revoked_at
                );

                if (inProfile) {
                    throw new Error("You have already attested to this user.");
                }

                // It exists on-chain but NOT in DB. Recover it.
                setTxStatus("pending");
                setErrorMsg("Syncing existing attestation...");

                let txHash = `recovered-${Date.now()}`;
                let score = 0;

                try {
                    // Try to get real event data first
                    const filter = attestationContract.filters.AttestationCreated(
                        user?.wallet?.address,
                        walletAddress
                    );

                    // Try to query, but if it fails (e.g. RPC limits), fallback to contract read
                    const events = await attestationContract.queryFilter(filter);

                    if (events.length > 0) {
                        const event = events[events.length - 1]; // Get latest
                        txHash = event.transactionHash;
                        score = Number((event as any).args?.[2]);
                    } else {
                        // Event exists but queryFilter didn't find it (maybe block range issue)
                        // Treat as error to trigger fallback
                        throw new Error("No events returned from queryFilter");
                    }
                } catch (err) {
                    console.warn("Could not find event logs, falling back to contract read:", err);

                    // Fallback: Get score directly from contract
                    try {
                        const scoreBigInt = await attestationContract.getAttestation(
                            user?.wallet?.address,
                            walletAddress
                        );
                        score = Number(scoreBigInt);
                        // Use a deterministic placeholder that is unique per pair so it satisfies DB constraints
                        // but allows re-sync if needed.
                        txHash = `recovered-${user?.wallet?.address}-${walletAddress}-${Date.now()}`;
                    } catch (readErr) {
                        console.error("Could not read contract state:", readErr);
                        throw new Error("Could not verify attestation details.");
                    }
                }

                await fetch("/api/attestations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: user?.wallet?.address,
                        to: walletAddress,
                        score: score,
                        comment: attestComment || "Synced from chain (recovered)",
                        txHash: txHash
                    })
                });

                setTxStatus("success");
                // Wait a bit then refresh
                setTimeout(() => {
                    setShowAttestModal(false);
                    setTxStatus("idle");
                    setAttestComment("");
                    fetchProfile(walletAddress);
                }, 2000);
                return;
            }

            // 2. Estimate Gas
            try {
                await attestationContract.attest.estimateGas(walletAddress, attestScore);
            } catch (err: any) {
                console.error("Gas estimation failed:", err);
                if (err.message?.includes("AttestationAlreadyExists") || err.data?.includes("0x")) {
                    throw new Error("You have already attested to this user");
                }
                throw err;
            }

            const tx = await attestationContract.attest(walletAddress, attestScore);
            const receipt = await tx.wait();

            // Save comment off-chain
            if (receipt.status === 1) {
                await fetch("/api/attestations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: user?.wallet?.address,
                        to: walletAddress,
                        score: attestScore,
                        comment: attestComment,
                        txHash: receipt.hash
                    })
                });
            }

            setTxStatus("success");
            setTimeout(() => {
                setShowAttestModal(false);
                setTxStatus("idle");
                setAttestComment(""); // Reset comment
                fetchProfile(walletAddress); // Refresh data
            }, 2000);
        } catch (error: unknown) {
            console.error("Attest error:", error);
            setTxStatus("error");

            // Try to extract readable error message
            let msg = (error as Error).message || "Transaction failed";
            if (msg.includes("user rejected") || msg.includes("User rejected")) {
                msg = "Transaction cancelled";
            } else if (msg.includes("AttestationAlreadyExists") || msg.includes("already attested") || msg.includes("on-chain")) {
                msg = "You have already attested to this user";
            }

            setErrorMsg(msg);
        }
    }

    async function handleRevoke() {
        if (!authenticated || !walletAddress) return;

        if (!confirm("Are you sure you want to revoke your attestation? This will remove your score and comment.")) {
            return;
        }

        setTxStatus("pending");
        setErrorMsg("Revoking...");

        try {
            const currentWallet = wallets[0];
            if (!currentWallet) throw new Error("No wallet connected");

            const ethereumProvider = await currentWallet.getEthereumProvider();
            const provider = new ethers.BrowserProvider(ethereumProvider);
            const signer = await provider.getSigner();
            const attestationContract = new ethers.Contract(ADDRESSES.attestation, ATTESTATION_ABI, signer);

            const tx = await attestationContract.revokeAttestation(walletAddress);
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                await fetch("/api/attestations/revoke", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        from: user?.wallet?.address,
                        to: walletAddress,
                        txHash: receipt.hash
                    })
                });

                // Optimistic Update: Update local state immediately
                setProfile(prev => {
                    if (!prev) return null;
                    const updatedAttestations = prev.attestations.map(a => {
                        if (a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase()) {
                            return { ...a, revoked_at: new Date().toISOString() };
                        }
                        return a;
                    });

                    // Recalculate score locally for instant feedback
                    // (Assuming we know the score of the revoked attestation)
                    const revokedAttestation = prev.attestations.find(a => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase());
                    const scoreToRemove = revokedAttestation ? revokedAttestation.score : 0;

                    // Simple approximation: subtract score. 
                    // Note: The real formula uses average, but for immediate feedback removing the count is key.
                    // We'll let fetchProfile fix the exact math later.

                    return {
                        ...prev,
                        reputation: {
                            ...prev.reputation,
                            received_count: Math.max(0, prev.reputation.received_count - 1),
                            // We won't try to perfect the score math locally, just trigger the button flip
                        },
                        attestations: updatedAttestations
                    };
                });
            }

            setTxStatus("success");
            setTimeout(() => {
                setShowAttestModal(false);
                setTxStatus("idle");
                fetchProfile(walletAddress);
            }, 2000);

        } catch (error: unknown) {
            console.error("Revoke error:", error);
            setTxStatus("error");
            setErrorMsg((error as Error).message || "Revocation failed");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <div className="flex items-center justify-center h-screen">
                    <div className="w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen grid-bg">
                <Header />
                <div className="pt-32 text-center">
                    <div className="text-4xl mb-4">😕</div>
                    <h2 className="text-xl font-bold mb-2">User Not Found</h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        {error || "We couldn't find a profile for this wallet address."}
                    </p>
                    <a href="/attest" className="btn-primary inline-block opacity-80 hover:opacity-100">
                        Back to Search
                    </a>
                </div>
            </div>
        );
    }

    const isOwnProfile = authenticated && user?.wallet?.address?.toLowerCase() === walletAddress.toLowerCase();

    return (
        <div className="min-h-screen grid-bg pb-20">
            <Header />

            {/* --- Cover / Header Area --- */}
            <div className="h-64 bg-gradient-to-b from-[var(--accent-purple)]/20 to-transparent relative">
                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[var(--bg-dark)] to-transparent" />
            </div>

            <main className="px-6 -mt-20 relative z-10 max-w-5xl mx-auto">
                {/* Profile Card Header */}
                <div className="glass-card p-8 mb-8 flex flex-col md:flex-row items-end md:items-center gap-8">
                    <div className="w-32 h-32 rounded-3xl border-4 border-[var(--bg-dark)] shadow-2xl relative group bg-black">
                        <UserAvatar
                            src={profile.pfp_url}
                            alt={profile.display_name || walletAddress}
                            className="w-full h-full rounded-2xl"
                            size="xl"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold font-mono tracking-tight">
                                {profile.display_name || shortenAddress(walletAddress)}
                            </h1>
                            {profile.x_username && (
                                <a
                                    href={`https://x.com/${profile.x_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-500/10 text-blue-400 p-1.5 rounded-full hover:bg-blue-500/20 transition-colors"
                                >
                                    <Twitter className="w-4 h-4 fill-current" />
                                </a>
                            )}
                        </div>

                        <div className="text-[var(--text-secondary)] font-mono text-sm mb-4 flex flex-col gap-1">
                            <div>{shortenAddress(walletAddress)}</div>
                            {profile.x_username && <div className="text-blue-400">@{profile.x_username}</div>}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)] mb-4">
                            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-[var(--accent-purple)]" />
                                Joined {profile.joined_at ? new Date(profile.joined_at).toLocaleDateString() : "Unknown"}
                            </span>

                            {isOwnProfile && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--accent-green)] font-bold">That&apos;s You!</span>
                                    {user?.twitter ? (
                                        <button
                                            onClick={() => unlinkTwitter(user.twitter!.subject)}
                                            className="text-xs text-red-400 hover:text-red-300 underline"
                                        >
                                            Unlink X
                                        </button>
                                    ) : (
                                        <button
                                            onClick={linkTwitter}
                                            className="flex items-center gap-1.5 text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition-colors font-bold"
                                        >
                                            <Twitter className="w-3 h-3 fill-current" /> Connect X
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reputation Score & Action */}
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <div className="text-center md:text-right">
                            <div className="text-5xl font-bold gradient-text leading-tight">
                                {profile.reputation?.score || 0}
                            </div>
                            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Reputation Score</div>
                        </div>

                        {!isOwnProfile && (
                            <button
                                onClick={() => {
                                    if (!authenticated) return login();
                                    const hasActive = profile.attestations.some(a => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase() && !a.revoked_at);
                                    if (hasActive) {
                                        handleRevoke();
                                    } else {
                                        setShowAttestModal(true);
                                    }
                                }}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${profile.attestations.some(a => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase() && !a.revoked_at)
                                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                    : "btn-primary"
                                    }`}
                            >
                                <span>
                                    {profile.attestations.some(a => a.from_wallet.toLowerCase() === user?.wallet?.address?.toLowerCase() && !a.revoked_at)
                                        ? <><Trash2 className="w-4 h-4" /> Revoke Attestation</>
                                        : <><Star className="w-4 h-4" /> Attest to User</>
                                    }
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center border-b border-[var(--border-color)] mb-8">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === "overview"
                            ? "border-[var(--accent-green)] text-[var(--accent-green)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-white"
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("attestations")}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === "attestations"
                            ? "border-[var(--accent-green)] text-[var(--accent-green)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-white"
                            }`}
                    >
                        Attestations <span className="ml-2 opacity-60 bg-white/10 px-2 py-0.5 rounded-full text-xs">{profile.attestations.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("projects")}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === "projects"
                            ? "border-[var(--accent-green)] text-[var(--accent-green)]"
                            : "border-transparent text-[var(--text-secondary)] hover:text-white"
                            }`}
                    >
                        Projects <span className="ml-2 opacity-60 bg-white/10 px-2 py-0.5 rounded-full text-xs">{profile.projects.length}</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-6 flex flex-col items-center justify-center text-center hover:border-[var(--accent-green)]/30 transition-colors">
                                <Shield className="w-8 h-8 text-[var(--accent-green)] mb-3 opacity-80" />
                                <div className="text-2xl font-bold mb-1 font-mono">{profile.reputation.received_count}</div>
                                <div className="text-sm text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Attestations Received</div>
                            </div>
                            <div className="glass-card p-6 flex flex-col items-center justify-center text-center hover:border-[var(--accent-purple)]/30 transition-colors">
                                <Star className="w-8 h-8 text-[var(--accent-purple)] mb-3 opacity-80" />
                                <div className="text-2xl font-bold mb-1 font-mono">{profile.reputation.given_count}</div>
                                <div className="text-sm text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Attestations Given</div>
                            </div>
                            <div className="glass-card p-6 flex flex-col items-center justify-center text-center hover:border-blue-500/30 transition-colors">
                                <Activity className="w-8 h-8 text-blue-400 mb-3 opacity-80" />
                                <div className="text-2xl font-bold mb-1 font-mono">{profile.projects.length}</div>
                                <div className="text-sm text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Projects Launched</div>
                            </div>
                        </div>
                    )}

                    {activeTab === "attestations" && (
                        <div className="space-y-4">
                            {profile.attestations.length === 0 ? (
                                <div className="p-12 text-center text-[var(--text-secondary)] bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    No attestations received yet
                                </div>
                            ) : (
                                profile.attestations.map((att) => (
                                    <div key={att.tx_hash} className={`glass-card p-4 flex flex-col gap-3 transition-opacity hover:bg-white/5 ${att.revoked_at ? "opacity-50 grayscale" : ""}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 shrink-0">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-mono text-sm flex items-center gap-2">
                                                        <span className="truncate">{shortenAddress(att.from_wallet)}</span>
                                                        {att.revoked_at && <span className="text-[10px] uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold tracking-wider">Revoked</span>}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(att.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-bold px-3 py-1 rounded-lg bg-black/30 flex items-center gap-1 whitespace-nowrap ${att.revoked_at ? "line-through text-[var(--text-muted)]" :
                                                att.score >= 4 ? "text-[var(--accent-green)]" :
                                                    att.score >= 2 ? "text-yellow-400" :
                                                        att.score >= 0 ? "text-gray-400" : "text-red-400"
                                                }`}>
                                                {att.score > 0 ? `+${att.score}` : att.score} Trust
                                            </div>
                                        </div>
                                        {att.comment && (
                                            <div className="ml-14 bg-white/5 p-3 rounded-lg text-sm text-gray-300 italic border-l-2 border-white/10">
                                                &quot;{att.comment}&quot;
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "projects" && (
                        <div className="space-y-4">
                            {profile.projects.length === 0 ? (
                                <div className="p-12 text-center text-[var(--text-secondary)] bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    No projects created yet
                                </div>
                            ) : (
                                profile.projects.map((proj) => (
                                    <div key={proj.id} className="glass-card p-6">
                                        <h3 className="font-bold text-lg mb-2">{proj.name || `Project #${proj.id}`}</h3>
                                        <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">
                                            {proj.description || "No description provided"}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-white/10 pt-4">
                                            <span>Created {new Date(proj.created_at).toLocaleDateString()}</span>
                                            <a href={`/app/projects/${proj.id}`} className="text-[var(--accent-purple)] hover:underline">View Project →</a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main >

            {/* --- Attestation Modal --- */}
            {
                showAttestModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowAttestModal(false)}
                        />
                        <div className="relative glass-card p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={() => setShowAttestModal(false)}
                                className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white"
                            >
                                ✕
                            </button>

                            <h2 className="text-2xl font-bold mb-6 text-center">Attest to User</h2>

                            {/* Score Scale */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium mb-4 text-center">
                                    Trust Score: <span className={scores[attestScore + 1].color}>{scores[attestScore + 1].label}</span>
                                </label>

                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {scores.map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => setAttestScore(s.value)}
                                            className={`h-10 rounded-md text-sm font-bold transition-all ${attestScore === s.value
                                                ? "bg-[var(--accent-green)] text-black scale-110 shadow-lg"
                                                : "bg-white/5 hover:bg-white/10"
                                                }`}
                                        >
                                            {s.value}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-[var(--text-muted)] mt-2">
                                    {scores[attestScore + 1].desc}
                                </p>
                            </div>

                            {/* Comment Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Comment (Optional)</label>
                                <textarea
                                    value={attestComment}
                                    onChange={(e) => setAttestComment(e.target.value)}
                                    placeholder="Why do you trust this user?"
                                    className="input-field w-full h-24 resize-none"
                                    maxLength={280}
                                />
                            </div>

                            {/* Transaction Status */}
                            {txStatus === "pending" && (
                                <div className="p-4 mb-4 bg-[var(--accent-purple)]/10 rounded-xl text-center">
                                    <div className="w-5 h-5 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <span className="text-sm">Confirming on-chain...</span>
                                </div>
                            )}

                            {txStatus === "success" && (
                                <div className="p-4 mb-4 bg-[var(--accent-green)]/10 rounded-xl text-center text-[var(--accent-green)]">
                                    ✓ Attested successfully!
                                </div>
                            )}

                            {txStatus === "error" && (
                                <div className="p-4 mb-4 bg-red-500/10 rounded-xl text-center text-red-400 text-sm">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                onClick={handleAttest}
                                disabled={txStatus === "pending" || txStatus === "success"}
                                className="btn-primary w-full py-4 text-lg"
                            >
                                {txStatus === "pending" ? "Processing..." : "Submit Attestation"}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
