import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ wallet: string }> }
) {
    try {
        const { wallet: rawWallet } = await params;
        const wallet = rawWallet.toLowerCase();

        if (!ethers.isAddress(wallet)) {
            return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
        }

        // 1. Fetch User Metadata
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("wallet, created_at, last_seen, x_username, display_name, pfp_url")
            .eq("wallet", wallet)
            .single();

        if (userError && userError.code !== "PGRST116") {
            console.error("User fetch error:", userError);
            throw userError;
        }

        // 2. Fetch Reputation Score
        const { data: reputation } = await supabase
            .from("reputation_scores")
            .select("score, attestations_received, attestations_given")
            .eq("wallet", wallet)
            .single();

        // 3. Fetch Received Attestations
        const { data: attestations } = await supabase
            .from("attestations")
            .select("from_wallet, score, comment, created_at, tx_hash, revoked_at")
            .eq("to_wallet", wallet)
            .order("created_at", { ascending: false });

        // 4. Fetch Projects Created
        const { data: projects } = await supabase
            .from("projects")
            .select("*")
            .eq("owner", wallet)
            .order("created_at", { ascending: false });

        // Construct the profile object
        const profile = {
            wallet,
            joined_at: user?.created_at || null,
            last_seen: user?.last_seen || null,
            x_username: user?.x_username || null,
            display_name: user?.display_name || null,
            pfp_url: user?.pfp_url || null,
            reputation: {
                score: reputation?.score || 0,
                received_count: reputation?.attestations_received || 0,
                given_count: reputation?.attestations_given || 0,
            },
            attestations: attestations || [],
            projects: projects || [],
        };

        return NextResponse.json({ profile });
    } catch (error: unknown) {
        console.error("Profile fetch error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
