"use client";

import { Header } from "@/components/Header";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function Home() {
  const { login, authenticated } = usePrivy();

  return (
    <div className="min-h-screen grid-bg selection:bg-[var(--accent-green)] selection:text-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--accent-green)] opacity-5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 mb-8 backdrop-blur-md animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
            <span className="text-xs font-mono text-[var(--accent-green)] tracking-wider uppercase">Live on Sepolia</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight tracking-tighter">
            STAKE ON <br />
            <span className="gradient-text-accent">TRUSTED</span> PROJECTS
          </h1>

          <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed">
            The first reputation-based staking protocol.
            <span className="text-white"> Attest</span> to verify projects.
            <span className="text-white"> Stake</span> to earn rewards.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {authenticated ? (
              <>
                <Link href="/projects" className="btn-primary text-lg px-10 py-5 w-full sm:w-auto shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                  Start Staking
                </Link>
                <Link href="/dashboard" className="btn-secondary text-lg px-10 py-5 w-full sm:w-auto">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <button onClick={login} className="btn-primary text-lg px-12 py-4 w-full sm:w-auto shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                  Connect Wallet
                </button>
                <Link href="/projects" className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto">
                  Explore Ecosystem
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Activity Feed Section */}
      <section className="py-12 border-b border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-12 items-start justify-center">
            <div className="flex-1 text-center md:text-left pt-8">
              <h2 className="text-3xl font-bold mb-4">Community <span className="gradient-text-primary">Pulse</span></h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8 max-w-md">
                Watch the ecosystem grow in real-time. See who is building trust and staking on the future.
              </p>
              <div className="inline-block p-4 rounded-xl bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20">
                <div className="text-2xl font-bold text-[var(--accent-green)]">1,245</div>
                <div className="text-sm text-[var(--text-muted)]">Actions in last 24h</div>
              </div>
            </div>
            <div className="w-full md:w-[450px]">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </section>

      {/* Ticker / Stats Section */}
      <section className="py-10 border-y border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-between gap-8 md:gap-0">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Total Value Locked</span>
              <span className="text-3xl font-mono font-bold text-white">$42,069.00</span>
            </div>
            <div className="flex flex-col gap-1 border-l border-white/10 md:pl-12">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Active Projects</span>
              <span className="text-3xl font-mono font-bold text-[var(--accent-purple)]">12</span>
            </div>
            <div className="flex flex-col gap-1 border-l border-white/10 md:pl-12">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Total Attestations</span>
              <span className="text-3xl font-mono font-bold text-[var(--accent-blue)]">847</span>
            </div>
            <div className="flex flex-col gap-1 border-l border-white/10 md:pl-12">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Unique Stakers</span>
              <span className="text-3xl font-mono font-bold text-white">156</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-sm font-mono text-[var(--accent-green)] mb-4 uppercase tracking-widest text-center">Protocol Mechanics</h2>
          <h3 className="text-4xl font-bold text-center mb-16">Designed for <span className="text-[var(--text-secondary)]">Trust</span></h3>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-10 group hover:bg-white/5 transition-all duration-500">
              <div className="mb-6 w-12 h-12 rounded-lg bg-[var(--accent-green)]/10 flex items-center justify-center border border-[var(--accent-green)]/20 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold mb-3 font-mono">Reputation Engine</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                On-chain identity built on trust. Vouch for reliable projects and build your wallet&apos;s reputation score.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-10 group hover:bg-white/5 transition-all duration-500">
              <div className="mb-6 w-12 h-12 rounded-lg bg-[var(--accent-purple)]/10 flex items-center justify-center border border-[var(--accent-purple)]/20 group-hover:scale-110 transition-transform">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-xl font-bold mb-3 font-mono">Stake & Earn</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Deposit ETH into verified project pools. Earn ERC20 rewards distributed continuously per block.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-10 group hover:bg-white/5 transition-all duration-500">
              <div className="mb-6 w-12 h-12 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center border border-[var(--accent-blue)]/20 group-hover:scale-110 transition-transform">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-3 font-mono">Instant Claims</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                No lockup periods on rewards. Claim your tokens anytime. Full transparency on the Ethereum blockchain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--accent-green)]" />
            <span className="font-mono font-bold text-lg">StakeFi</span>
          </div>

          <div className="flex gap-8">
            <a href="https://sepolia.etherscan.io/address/0xbDa97d12b19F35e259992FCe3E1E517fA284decC"
              target="_blank"
              className="text-[var(--text-secondary)] hover:text-white text-sm font-mono tracking-wide transition-colors">
              CONTRACTS
            </a>
            <a href="https://github.com" target="_blank" className="text-[var(--text-secondary)] hover:text-white text-sm font-mono tracking-wide transition-colors">
              GITHUB
            </a>
            <a href="#" className="text-[var(--text-secondary)] hover:text-white text-sm font-mono tracking-wide transition-colors">
              TWITTER
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
