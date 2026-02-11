"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

export function useRegisterUser() {
    const { authenticated, user } = usePrivy();

    useEffect(() => {
        if (authenticated && user?.wallet?.address) {
            registerUser(user.wallet.address);
        }
    }, [authenticated, user?.wallet?.address]);
}

async function registerUser(wallet: string) {
    try {
        await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet }),
        });
    } catch (error) {
        console.error("Failed to register user:", error);
    }
}
