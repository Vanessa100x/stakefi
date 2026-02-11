"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Hexagon, Search, PlusCircle, LayoutDashboard, LogOut, Wallet, Trophy } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
    const { login, logout, authenticated, user } = usePrivy();
    const pathname = usePathname();
    const lastRegisteredWallet = useRef<string | null>(null);

    // Auto-register user when wallet connects or X links
    useEffect(() => {
        const walletAddress = user?.wallet?.address;
        const xAccount = user?.twitter;

        // We want to sync if:
        // 1. Authenticated
        // 2. We have a wallet address
        // 3. Either the wallet changed OR we haven't synced this session yet (simple check)
        // Note: For now, we rely on lastRegisteredWallet to prevent basic loops. 
        // We might want to trigger update if X account appears even if wallet didn't change.

        if (authenticated && walletAddress) {
            const hasXChanged = xAccount?.username && lastRegisteredWallet.current === walletAddress; // heuristic?
            // Actually, just syncing on change is fine. 
            // If we just mapped wallet -> wallet, we ignore if same.
            // If we now map wallet+X, we should sync if X changes.
            // For simplicity in this MVP: sync if wallet changes OR if we have X data and haven't synced it?
            // Let's just debounce or sync.

            if (walletAddress !== lastRegisteredWallet.current || (xAccount && !lastRegisteredWallet.current)) {
                lastRegisteredWallet.current = walletAddress;

                fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        wallet: walletAddress,
                        x_username: xAccount?.username,
                        display_name: xAccount?.name,
                        pfp_url: xAccount?.profilePictureUrl
                    }),
                }).catch((err) => {
                    console.error("Registration failed", err);
                    lastRegisteredWallet.current = null;
                });
            }
        }
    }, [authenticated, user?.wallet?.address, user?.twitter]);

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    const isActive = (path: string) => pathname === path;

    return (
        <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
            <div className="glass-card pl-4 pr-2 py-2 flex items-center gap-4 shadow-2xl bg-black/40 border border-white/10 rounded-full">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group mr-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent-green)] to-[var(--accent-blue)] flex items-center justify-center transform transition-transform group-hover:rotate-180 duration-500">
                        <Hexagon className="text-black w-4 h-4 fill-current" />
                    </div>
                    <span className="text-lg font-bold tracking-tight font-mono hidden sm:block">StakeFi</span>
                </Link>

                {/* Navigation Pills */}
                <nav className="nav-pill hidden md:flex items-center gap-1">
                    <Link href="/projects" className={`nav-item flex items-center gap-2 ${isActive('/projects') ? 'active' : ''}`}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Projects</span>
                    </Link>
                    <Link href="/attest" className={`nav-item flex items-center gap-2 ${isActive('/attest') ? 'active' : ''}`}>
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                    </Link>
                    {authenticated && (
                        <Link href="/projects/create" className={`nav-item flex items-center gap-2 ${isActive('/projects/create') ? 'active' : ''}`}>
                            <PlusCircle className="w-4 h-4" />
                            <span>Create</span>
                        </Link>
                    )}
                    <Link href="/leaderboard" className={`nav-item flex items-center gap-2 ${isActive('/leaderboard') ? 'active' : ''}`}>
                        <Trophy className="w-4 h-4" />
                        <span>Leaderboard</span>
                    </Link>
                </nav>

                {/* Wallet */}
                <div className="flex items-center gap-3 pl-2 border-l border-[var(--border-color)]">
                    <ThemeToggle />
                    {authenticated ? (
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] rounded-full transition-colors group border border-[var(--border-color)]">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
                                <span className="text-sm font-medium font-mono text-[var(--accent-green)]">
                                    {user?.wallet?.address ? shortenAddress(user.wallet.address) : "Connected"}
                                </span>
                            </Link>
                            <button onClick={logout} className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all" title="Logout">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={login} className="btn-primary py-2 px-5 text-sm flex items-center gap-2 hover:brightness-110">
                            <Wallet className="w-4 h-4" />
                            <span>Connect</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
