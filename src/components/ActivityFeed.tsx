"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityItem {
    id: string;
    type: "attestation" | "stake";
    createdAt: string;
    user: {
        wallet: string;
        displayName?: string;
        username?: string;
        pfpUrl?: string;
    };
    target: string;
    details?: string;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchActivity() {
        try {
            const res = await fetch("/api/activity");
            const data = await res.json();
            if (data.activity) {
                setActivities(data.activity);
            }
        } catch (error) {
            console.error("Failed to fetch activity:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (loading && activities.length === 0) {
        return <div className="animate-pulse h-40 bg-white/5 rounded-xl" />;
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <h3 className="text-sm font-mono text-[var(--accent-green)] mb-4 uppercase tracking-widest text-center">Live Activity</h3>
            <div className="flex flex-col gap-3 relative">
                <AnimatePresence mode="popLayout">
                    {activities.map((item) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={item.id}
                            className="glass-card p-3 flex items-center gap-3 border border-white/5 hover:border-[var(--accent-green)]/30 transition-colors"
                        >
                            <UserAvatar
                                src={item.user.pfpUrl}
                                alt={item.user.username || item.user.wallet}
                                size={40}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm truncate">
                                        {item.user.username || item.user.displayName || `${item.user.wallet.slice(0, 4)}...${item.user.wallet.slice(-4)}`}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-sm text-[var(--text-secondary)] truncate">
                                    {item.type === "attestation" ? (
                                        <>
                                            attested to <span className="text-[var(--accent-blue)]">
                                                {item.target.startsWith("0x") ? `${item.target.slice(0, 6)}...` : item.target}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            staked <span className="text-[var(--accent-green)]">{item.details}</span> on <span className="text-white">{item.target}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {activities.length === 0 && !loading && (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        No recent activity
                    </div>
                )}
            </div>
        </div>
    );
}
